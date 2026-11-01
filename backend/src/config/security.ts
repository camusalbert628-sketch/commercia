import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../middleware/errorHandler';

// Google OAuth Client
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleOAuthClient = new OAuth2Client(googleClientId);

// Cache for runtime-generated secure secret (in dev only)
let runtimeDevSecret: string | null = null;
let runtimeDevRefreshSecret: string | null = null;

/**
 * Récupère et valide rigoureusement la clé secrète JWT principale.
 * En production, lève une exception fatale si JWT_SECRET est absent ou trop faible.
 */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  if (!secret || secret === 'default-secret' || secret.length < 16) {
    if (isProduction) {
      console.error('❌ [FATAL SECURITY ERROR] La variable JWT_SECRET est absente ou non sécurisée en production !');
      throw new Error('Configuration de sécurité JWT invalide en production.');
    }

    if (!runtimeDevSecret) {
      runtimeDevSecret = crypto.randomBytes(32).toString('hex');
      console.warn('⚠️ [DEV SECURITY WARNING] JWT_SECRET non configuré. Utilisation d’une clé aléatoire éphémère pour cette session.');
    }
    return runtimeDevSecret;
  }

  return secret;
};

/**
 * Récupère et valide la clé secrète pour les refresh tokens.
 */
export const getJwtRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  if (!secret || secret === 'default-refresh-secret' || secret.length < 16) {
    if (isProduction) {
      console.error('❌ [FATAL SECURITY ERROR] La variable JWT_REFRESH_SECRET est absente ou non sécurisée en production !');
      throw new Error('Configuration de sécurité JWT_REFRESH invalide en production.');
    }

    if (!runtimeDevRefreshSecret) {
      runtimeDevRefreshSecret = crypto.randomBytes(32).toString('hex');
      console.warn('⚠️ [DEV SECURITY WARNING] JWT_REFRESH_SECRET non configuré. Utilisation d’une clé aléatoire éphémère.');
    }
    return runtimeDevRefreshSecret;
  }

  return secret;
};

/**
 * Liste blanche stricte des origines CORS autorisées
 */
export const getAllowedOrigins = (): (string | RegExp)[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];

  const defaultProductionOrigins = [
    'https://mycommercia.vercel.app',
    'https://commercia.vercel.app',
    /\.vercel\.app$/, // Autorise les previews Vercel du projet
  ];

  const devOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:5173',
  ];

  const isProduction = process.env.NODE_ENV === 'production';

  return [
    ...defaultProductionOrigins,
    ...envOrigins,
    ...(!isProduction ? devOrigins : []),
  ];
};

export interface VerifiedGoogleUser {
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

/**
 * Valide un jeton d'authentification Google émis par l'OAuth2 Google.
 * Vérifie la signature cryptographique auprès des serveurs Google et l'audience.
 */
export const verifyGoogleIdToken = async (
  credential?: string,
  fallbackData?: { email?: string; firstName?: string; lastName?: string; avatarUrl?: string }
): Promise<VerifiedGoogleUser> => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  if (credential) {
    try {
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId || undefined,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new AppError('Jeton Google invalide : données utilisateur introuvables.', 401);
      }

      if (!payload.email_verified) {
        throw new AppError('Cette adresse email Google n’a pas été vérifiée par Google.', 403);
      }

      return {
        email: payload.email.toLowerCase().trim(),
        firstName: payload.given_name || payload.name?.split(' ')[0] || 'Commerçant',
        lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
        avatarUrl: payload.picture || undefined,
        emailVerified: true,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      console.error('❌ Échec de vérification du jeton Google OAuth:', err?.message || err);
      throw new AppError('Jeton d’authentification Google invalide ou expiré.', 401);
    }
  }

  // Si pas de credential (jeton cryptographique) :
  // En production, il est STRICTEMENT INTERDIT de faire confiance à un email non signé.
  if (isProduction) {
    throw new AppError(
      'Authentification Google non sécurisée : le jeton cryptographique Google (credential) est obligatoire en production.',
      401
    );
  }

  // En environnement de développement local uniquement :
  if (fallbackData?.email) {
    console.warn(`⚠️ [DEV AUTH WARNING] Connexion Google émulée sans jeton cryptographique pour ${fallbackData.email} (Autorisé uniquement hors production).`);
    return {
      email: fallbackData.email.toLowerCase().trim(),
      firstName: fallbackData.firstName || 'Commerçant',
      lastName: fallbackData.lastName || '',
      avatarUrl: fallbackData.avatarUrl,
      emailVerified: true,
    };
  }

  throw new AppError('Identifiant Google manquant.', 400);
};
