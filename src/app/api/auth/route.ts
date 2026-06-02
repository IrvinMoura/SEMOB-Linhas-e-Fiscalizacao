import { NextRequest, NextResponse } from 'next/server';
import { signSession, verifySession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value;
  const isAuthorized = verifySession(token);
  return NextResponse.json({ authenticated: isAuthorized });
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    
    if (
      username === process.env.ADMIN_USER &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = signSession(username);
      
      const response = NextResponse.json({ success: true, message: 'Autenticado com sucesso' });
      response.cookies.set('admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 1 day
        path: '/',
      });
      
      return response;
    }
    
    return NextResponse.json(
      { success: false, message: 'Usuário ou senha inválidos' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Logout realizado' });
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });
  return response;
}
