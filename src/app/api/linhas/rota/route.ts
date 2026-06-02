import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const isAuthorized = getAdminSession(req);
  if (!isAuthorized) {
    return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { linha_id, coordenadas, url_imagem } = await req.json();

    if (!linha_id) {
      return NextResponse.json({ success: false, message: 'ID da linha ausente' }, { status: 400 });
    }

    const coordenadasStr = coordenadas ? JSON.stringify(coordenadas) : null;
    const urlImg = url_imagem || '';

    // If url_imagem is provided, we update both; if not, we only update coordinates or preserve image
    if (urlImg) {
      await query(`
        INSERT INTO mapa_linha (linha_id, url_imagem, coordenadas_rota)
        VALUES ($1, $2, $3)
        ON CONFLICT (linha_id)
        DO UPDATE SET
          url_imagem = EXCLUDED.url_imagem,
          coordenadas_rota = COALESCE(EXCLUDED.coordenadas_rota, mapa_linha.coordenadas_rota)
      `, [linha_id, urlImg, coordenadasStr]);
    } else {
      await query(`
        INSERT INTO mapa_linha (linha_id, url_imagem, coordenadas_rota)
        VALUES ($1, '', $2)
        ON CONFLICT (linha_id)
        DO UPDATE SET
          coordenadas_rota = EXCLUDED.coordenadas_rota
      `, [linha_id, coordenadasStr]);
    }

    return NextResponse.json({ success: true, message: 'Itinerário/Rota salvo com sucesso!' });
  } catch (error: any) {
    console.error('Error saving line route coordinates:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao salvar rota interativa no banco de dados', error: error.message },
      { status: 500 }
    );
  }
}
