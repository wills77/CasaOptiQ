import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SESSION_COOKIE_NAME = 'casaoptiq_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// Ephemeral fallback secret for local dev if SESSION_SECRET env is absent
const FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  return process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'REPLACE_WITH_LONG_RANDOM_SECRET'
    ? process.env.SESSION_SECRET
    : FALLBACK_SECRET;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export interface SessionPayload {
  userId: number;
  role: 'admin' | 'customer';
  exp: number;
}

export function createSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed.userId || !parsed.role || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}

export interface AuthenticatedRequest extends Request {
  sessionUser?: {
    id: number;
    username: string | null;
    email: string;
    role: 'admin' | 'customer';
    must_change_password: number;
    full_name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
  };
}

export function getCookieToken(req: Request): string | undefined {
  return req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
}

export function requireAuth(
  loadUser: (id: number) => AuthenticatedRequest['sessionUser'] | undefined
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const token = getCookieToken(req);
    const payload = verifySessionToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Authentification requise.' });
      return;
    }
    const user = loadUser(payload.userId);
    if (!user) {
      clearSessionCookie(res);
      res.status(401).json({ error: 'Session invalide ou expirée.' });
      return;
    }
    req.sessionUser = user;
    next();
  };
}

export function requireAdmin(allowPendingPasswordChange = false) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.sessionUser || req.sessionUser.role !== 'admin') {
      res.status(403).json({ error: 'Accès administrateur requis.' });
      return;
    }
    if (!allowPendingPasswordChange && req.sessionUser.must_change_password === 1) {
      res.status(403).json({
        error: 'Changement de mot de passe obligatoire avant d’accéder à l’administration.',
        code: 'MUST_CHANGE_PASSWORD',
      });
      return;
    }
    next();
  };
}
