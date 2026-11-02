import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';

interface AttemptRecord {
  attempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

class BruteForceProtector {
  // Stockage en mémoire avec expiration
  private attemptsMap: Map<string, AttemptRecord> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  private getKey(req: Request, identifier?: string): string {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const cleanId = (identifier || (req.body?.email as string) || '').trim().toLowerCase();
    return `${ip}:${cleanId}`;
  }

  public check(req: Request, identifier?: string) {
    const key = this.getKey(req, identifier);
    const record = this.attemptsMap.get(key);

    if (record && record.lockedUntil && Date.now() < record.lockedUntil) {
      const remainingMinutes = Math.ceil((record.lockedUntil - Date.now()) / 60000);
      throw new AppError(
        `Compte temporairement verrouillé par mesure de sécurité après plusieurs tentatives infructueuses. Veuillez réessayer dans ${remainingMinutes} minute(s).`,
        429
      );
    }
  }

  public recordFailure(req: Request, identifier?: string) {
    const key = this.getKey(req, identifier);
    const now = Date.now();
    const existing = this.attemptsMap.get(key);

    if (!existing || now - existing.lastAttemptAt > this.ATTEMPT_WINDOW_MS) {
      this.attemptsMap.set(key, { attempts: 1, lockedUntil: null, lastAttemptAt: now });
      return;
    }

    const newAttempts = existing.attempts + 1;
    let lockedUntil: number | null = null;

    if (newAttempts >= this.MAX_ATTEMPTS) {
      lockedUntil = now + this.LOCK_DURATION_MS;
      console.warn(`[SECURITY ALERT] Verrouillage déclenché pour ${key} suite à ${newAttempts} échecs.`);
    }

    this.attemptsMap.set(key, { attempts: newAttempts, lockedUntil, lastAttemptAt: now });
  }

  public recordSuccess(req: Request, identifier?: string) {
    const key = this.getKey(req, identifier);
    this.attemptsMap.delete(key);
  }

  public cleanup() {
    const now = Date.now();
    for (const [key, record] of this.attemptsMap.entries()) {
      if (now - record.lastAttemptAt > this.ATTEMPT_WINDOW_MS && (!record.lockedUntil || now > record.lockedUntil)) {
        this.attemptsMap.delete(key);
      }
    }
  }
}

export const bruteForceProtector = new BruteForceProtector();

// Nettoyage régulier toutes les 10 minutes
setInterval(() => bruteForceProtector.cleanup(), 10 * 60 * 1000);

export const loginBruteForceMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  try {
    bruteForceProtector.check(req);
    next();
  } catch (err) {
    next(err);
  }
};
