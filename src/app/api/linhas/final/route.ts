import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const isAuthorized = getAdminSession(req);
  if (!isAuthorized) {
    return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { linha_id, rua, bairro, latitude, longitude } = await req.json();

    if (!linha_id) {
      return NextResponse.json({ success: false, message: 'ID da linha ausente' }, { status: 400 });
    }

    const latVal = latitude !== undefined && latitude !== null ? parseFloat(latitude) : null;
    const lonVal = longitude !== undefined && longitude !== null ? parseFloat(longitude) : null;

    await query(`
      INSERT INTO final_linha (linha_id, rua, bairro, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (linha_id)
      DO UPDATE SET
        rua = EXCLUDED.rua,
        bairro = EXCLUDED.bairro,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude
    `, [linha_id, rua || '', bairro || '', latVal, lonVal]);

    return NextResponse.json({ success: true, message: 'Final de linha salvo com sucesso!' });
  } catch (error: any) {
    console.error('Error saving final de linha:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao salvar informações do terminal', error: error.message },
      { status: 500 }
    );
  }
}
