import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  const isAuthorized = getAdminSession(req);
  if (!isAuthorized) {
    return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id, codigo, nome, ativa } = await req.json();

    if (!id || !codigo || !nome) {
      return NextResponse.json({ success: false, message: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    // Check if code is already used by another line
    const checkExists = await query('SELECT id FROM linha WHERE codigo_linha = $1 AND id != $2', [codigo, id]);
    if (checkExists.rowCount && checkExists.rowCount > 0) {
      return NextResponse.json({ success: false, message: 'Outra linha com este código já existe' }, { status: 400 });
    }

    await query(
      'UPDATE linha SET codigo_linha = $1, nome_linha = $2, ativa = $3 WHERE id = $4',
      [codigo, nome, ativa !== false, id]
    );

    return NextResponse.json({ success: true, message: 'Linha atualizada com sucesso!' });
  } catch (error: any) {
    console.error('Error updating bus line details:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao salvar alterações da linha', error: error.message },
      { status: 500 }
    );
  }
}
