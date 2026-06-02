import { NextRequest, NextResponse } from 'next/server';
import pool, { query } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const isAuthorized = getAdminSession(req);
  if (!isAuthorized) {
    return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { linha_id, horarios } = await req.json();

    if (!linha_id || !Array.isArray(horarios)) {
      return NextResponse.json({ success: false, message: 'Dados obrigatórios ausentes ou inválidos' }, { status: 400 });
    }

    // Get a client from the pool to run a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Delete all existing schedules for this line
      await client.query('DELETE FROM horario_saida WHERE id_linha = $1', [linha_id]);

      // 2. Insert new schedules
      if (horarios.length > 0) {
        for (const h of horarios) {
          if (!h.tipo_dia || !h.horario) continue;
          
          // Ensure time is in 'HH:MM:SS' or 'HH:MM' format
          let timeVal = h.horario;
          if (timeVal.split(':').length === 2) {
            timeVal += ':00'; // Add seconds if absent
          }

          await client.query(
            'INSERT INTO horario_saida (id_linha, tipo_dia, horario, observacao) VALUES ($1, $2, $3, $4)',
            [linha_id, h.tipo_dia, timeVal, h.observacao || '']
          );
        }
      }

      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true, message: 'Horários atualizados com sucesso!' });
  } catch (error: any) {
    console.error('Error saving schedules:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao atualizar horários no banco de dados', error: error.message },
      { status: 500 }
    );
  }
}
