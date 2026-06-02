import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';

// GET all lines with terminals, maps, routes, and schedules in 2 optimized queries (no N+1)
export async function GET(req: NextRequest) {
  try {
    // 1. Fetch all lines with final_linha and mapa_linha details
    const linesResult = await query(`
      SELECT l.id,
             l.codigo_linha,
             l.nome_linha,
             l.ativa,
             f.rua,
             f.bairro,
             f.latitude,
             f.longitude,
             f.referencia,
             m.url_imagem,
             m.descricao as mapa_descricao,
             m.coordenadas_rota
      FROM linha l
      LEFT JOIN final_linha f ON f.linha_id = l.id
      LEFT JOIN mapa_linha m ON m.linha_id = l.id
      ORDER BY l.codigo_linha
    `);

    // 2. Fetch all schedules
    const schedulesResult = await query(`
      SELECT id_horario, id_linha, horario, tipo_dia, observacao
      FROM horario_saida
      ORDER BY 
        CASE tipo_dia
          WHEN 'UTIL' THEN 1
          WHEN 'SABADO' THEN 2
          WHEN 'DOMINGO' THEN 3
        END,
        horario
    `);

    // 3. Group schedules by line ID in memory
    const schedulesByLine: { [key: number]: any[] } = {};
    schedulesResult.rows.forEach(row => {
      if (!schedulesByLine[row.id_linha]) {
        schedulesByLine[row.id_linha] = [];
      }
      
      // format time '05:00:00' to '05:00'
      const timeStr = row.horario.substring(0, 5);
      
      schedulesByLine[row.id_linha].push({
        id: row.id_horario,
        tipo_dia: row.tipo_dia,
        horario: timeStr,
        observacao: row.observacao || ''
      });
    });

    // 4. Assemble final data structure
    const lines = linesResult.rows.map(row => {
      const lineSchedules = schedulesByLine[row.id] || [];
      const schedulesGrouped = {
        UTIL: lineSchedules.filter(s => s.tipo_dia === 'UTIL'),
        SABADO: lineSchedules.filter(s => s.tipo_dia === 'SABADO'),
        DOMINGO: lineSchedules.filter(s => s.tipo_dia === 'DOMINGO'),
      };

      let coordinates: [number, number][] = [];
      if (row.coordenadas_rota) {
        try {
          coordinates = JSON.parse(row.coordenadas_rota);
        } catch (e) {
          console.error(`Error parsing coordinates for line ${row.codigo_linha}:`, e);
        }
      }

      return {
        id: row.id,
        codigo: row.codigo_linha,
        nome: row.nome_linha,
        ativa: row.ativa !== false,
        terminal: {
          rua: row.rua || '',
          bairro: row.bairro || '',
          referencia: row.referencia || '',
          latitude: row.latitude ? parseFloat(row.latitude) : null,
          longitude: row.longitude ? parseFloat(row.longitude) : null,
        },
        mapa: {
          url_imagem: row.url_imagem || '',
          descricao: row.mapa_descricao || '',
          coordenadas_rota: coordinates
        },
        horarios: schedulesGrouped
      };
    });

    return NextResponse.json({ success: true, lines });
  } catch (error: any) {
    console.error('Error fetching bus lines:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar linhas do banco de dados', error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new line (Admin only)
export async function POST(req: NextRequest) {
  const isAuthorized = getAdminSession(req);
  if (!isAuthorized) {
    return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { codigo, nome } = await req.json();

    if (!codigo || !nome) {
      return NextResponse.json({ success: false, message: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const checkExists = await query('SELECT id FROM linha WHERE codigo_linha = $1', [codigo]);
    if (checkExists.rowCount && checkExists.rowCount > 0) {
      return NextResponse.json({ success: false, message: 'Uma linha com este código já existe' }, { status: 400 });
    }

    const result = await query(
      'INSERT INTO linha (codigo_linha, nome_linha, ativa) VALUES ($1, $2, true) RETURNING id',
      [codigo, nome]
    );

    const newLineId = result.rows[0].id;

    // Seed default final_linha and mapa_linha rows to ensure left joins work properly
    await query('INSERT INTO final_linha (linha_id, rua, bairro) VALUES ($1, $2, $3)', [newLineId, '', '']);
    await query('INSERT INTO mapa_linha (linha_id, url_imagem) VALUES ($1, $2)', [newLineId, '']);

    return NextResponse.json({ 
      success: true, 
      message: 'Linha criada com sucesso', 
      lineId: newLineId 
    });
  } catch (error: any) {
    console.error('Error creating bus line:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao salvar linha no banco de dados', error: error.message },
      { status: 500 }
    );
  }
}
