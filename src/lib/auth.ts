import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'semob_default_secret_key_999';

interface SessionData {
  username: string;
  expires: number;
}

// Simple and robust cookie-based session manager using native Node crypto
export function signSession(username: string): string {
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload: SessionData = { username, expires };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(payloadStr);
  const signature = hmac.digest('base64url');
  
  return `${payloadStr}.${signature}`;
}

export function verifySession(token: string | undefined): boolean {
  if (!token) return false;
  
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  
  const [payloadStr, signature] = parts;
  
  // Verify signature
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(payloadStr);
  const expectedSignature = hmac.digest('base64url');
  
  if (signature !== expectedSignature) return false;
  
  try {
    const payload: SessionData = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString('utf8')
    );
    
    // Check expiration
    if (Date.now() > payload.expires) {
      return false;
    }
    
    return payload.username === process.env.ADMIN_USER;
  } catch {
    return false;
  }
}

export function getAdminSession(req: NextRequest): boolean {
  const token = req.cookies.get('admin_session')?.value;
  return verifySession(token);
}
