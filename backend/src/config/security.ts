import crypto from 'crypto';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { AppError } from '../middleware/errorHandler';

// Cache for runtime-generated secure secrets (in dev/test only)
let runtimeDevSecret: string | null = null;
let runtimeDevRefreshSecret: string | null = null;
let runtimeDevOtpHmacSecret: string | null = null;

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
    }
    return runtimeDevRefreshSecret;
  }

  return secret;
};

/**
 * Récupère le secret serveur dédié au calcul de l'empreinte HMAC-SHA-256 des codes OTP administrateur.
 * Indépendant du code OTP et de la base de données (ADMIN_OTP_HASH_SECRET).
 */
export const getAdminOtpHashSecret = (): string => {
  const secret = process.env.ADMIN_OTP_HASH_SECRET;
  if (secret && secret.trim().length >= 16) {
    return secret.trim();
  }

  // Dérivation déterministe distincte de JWT_SECRET si ADMIN_OTP_HASH_SECRET n'est pas encore renseigné,
  // afin que le secret HMAC OTP soit toujours cryptographiquement distinct du secret de signature JWT.
  const jwtBase = process.env.JWT_SECRET;
  if (jwtBase && jwtBase.length >= 16) {
    return crypto.createHmac('sha256', jwtBase).update('COMMERCIA_DEDICATED_ADMIN_OTP_HMAC_KEY_V1').digest('hex');
  }

  if (!runtimeDevOtpHmacSecret) {
    runtimeDevOtpHmacSecret = crypto.randomBytes(32).toString('hex');
  }
  return runtimeDevOtpHmacSecret;
};

/**
 * Indique si la variable d'environnement dédiée ADMIN_OTP_HASH_SECRET est explicitement définie
 */
export const isExplicitOtpHashSecretConfigured = (): boolean => {
  return Boolean(process.env.ADMIN_OTP_HASH_SECRET && process.env.ADMIN_OTP_HASH_SECRET.trim().length >= 16);
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
    /\.vercel\.app$/,
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

/**
 * Liste blanche stricte des URL de redirection OAuth autorisées
 */
export const validateOAuthRedirectUri = (redirectUri?: string): boolean => {
  if (!redirectUri) return true;
  const allowedExact = new Set([
    'https://mycommercia.vercel.app',
    'https://mycommercia.vercel.app/auth',
    'https://mycommercia.vercel.app/login',
    'https://mycommercia.vercel.app/auth/callback',
    'https://commercia.vercel.app',
    'https://commercia.vercel.app/auth',
    'https://commercia.vercel.app/login',
    ...(process.env.NODE_ENV !== 'production'
      ? [
          'http://localhost:5173',
          'http://localhost:5173/auth',
          'http://localhost:5173/login',
          'http://localhost:3000',
          'http://localhost:3000/auth',
          'http://localhost:3000/login',
        ]
      : []),
  ]);
  return allowedExact.has(redirectUri.trim());
};

// Google OAuth Client & Allowed Audiences
export const googleClientId =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.VITE_GOOGLE_CLIENT_ID ||
  '210731042943-aaap4r2isg8upmn22qapoifnd15703tn.apps.googleusercontent.com';

export const allowedGoogleClientIds = Array.from(
  new Set(
    [
      googleClientId,
      '210731042943-aaap4r2isg8upmn22qapoifnd15703tn.apps.googleusercontent.com',
    ].filter(Boolean)
  )
);

const googleOAuthClient = new OAuth2Client(googleClientId);

export interface VerifiedGoogleUser {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  iss: string;
  aud: string;
  azp?: string;
  exp: number;
  nonce?: string;
}

// Hook d'inspection/simulation cryptographique strictement isolé pour NODE_ENV === 'test'
type TestTokenVerifier = (idToken: string) => Promise<TokenPayload>;
let testTokenVerifier: TestTokenVerifier | null = null;

export const setGoogleTestTokenVerifier = (verifier: TestTokenVerifier | null) => {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    throw new Error('Interdit en production : setGoogleTestTokenVerifier est réservé aux tests automatisés.');
  }
  testTokenVerifier = verifier;
};

/**
 * Valide rigoureusement un jeton cryptographique Google OpenID Connect (ID Token).
 * Vérifie obligatoirement :
 * - La signature cryptographique du token Google (ou via le vérificateur de test en NODE_ENV=test)
 * - Le claim `iss` ('accounts.google.com' | 'https://accounts.google.com')
 * - Le claim `aud` (doit appartenir à allowedGoogleClientIds)
 * - Le claim `azp` lorsque pertinent (doit appartenir à allowedGoogleClientIds)
 * - Le claim `exp` (non expiré)
 * - Le claim `sub` (identifiant Google immuable)
 * - Le claim `email`
 * - Le claim `email_verified` (strictement true)
 * - Le claim `nonce` lorsque attendu (protection contre le rejeu)
 *
 * RÈGLE ABSOLUE : Ne considère JAMAIS une adresse e-mail envoyée par le frontend comme preuve d'identité.
 */
export const verifyGoogleIdToken = async (
  credential?: string,
  options?: { expectedNonce?: string; redirectUri?: string }
): Promise<VerifiedGoogleUser> => {
  if (!credential || typeof credential !== 'string' || !credential.trim()) {
    throw new AppError(
      'Jeton cryptographique Google OpenID Connect (credential) manquant. L’authentification par simple e-mail non signé est strictement interdite.',
      401
    );
  }

  if (options?.redirectUri && !validateOAuthRedirectUri(options.redirectUri)) {
    throw new AppError('URL de redirection OAuth non autorisée.', 400);
  }

  let payload: TokenPayload | undefined;

  try {
    if (process.env.NODE_ENV === 'test' && testTokenVerifier) {
      payload = await testTokenVerifier(credential.trim());
    } else {
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken: credential.trim(),
        audience: allowedGoogleClientIds,
      });
      payload = ticket.getPayload();
    }
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      `Signature cryptographique ou structure du jeton Google invalide : ${err?.message || 'Vérification rejetée'}`,
      401
    );
  }

  if (!payload) {
    throw new AppError('Jeton Google invalide : charge utile (payload) introuvable.', 401);
  }

  // 1. Vérification stricte du claim `iss` (émetteur)
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!payload.iss || !validIssuers.includes(payload.iss)) {
    throw new AppError(`Émetteur du jeton Google invalide (iss: ${payload.iss || 'absent'}).`, 401);
  }

  // 2. Vérification stricte du claim `aud` (audience)
  const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const hasValidAud = audList.some((a) => Boolean(a && allowedGoogleClientIds.includes(a)));
  if (!hasValidAud) {
    throw new AppError(`Audience du jeton Google non autorisée (aud: ${String(payload.aud)}).`, 401);
  }

  // 3. Vérification du claim `azp` (authorized party) lorsque présent
  if (payload.azp && !allowedGoogleClientIds.includes(payload.azp)) {
    throw new AppError(`Partie autorisée (azp) du jeton Google non reconnue (${payload.azp}).`, 401);
  }

  // 4. Vérification du claim `exp` (date d'expiration)
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (!payload.exp || typeof payload.exp !== 'number' || payload.exp <= nowInSeconds) {
    throw new AppError('Le jeton d’authentification Google a expiré (exp dépassé).', 401);
  }

  // 5. Vérification du claim `sub` (identifiant immuable du compte Google)
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
    throw new AppError('Identifiant Google immuable (sub) manquant dans le jeton.', 401);
  }

  // 6. Vérification du claim `email`
  if (!payload.email || typeof payload.email !== 'string' || !payload.email.includes('@')) {
    throw new AppError('Adresse e-mail Google manquante ou invalide dans le jeton.', 401);
  }

  // 7. Vérification stricte du claim `email_verified`
  if (payload.email_verified !== true) {
    throw new AppError('Cette adresse e-mail Google n’est pas vérifiée par Google (email_verified=false).', 403);
  }

  // 8. Vérification du claim `nonce` lorsque requis (protection anti-rejeu)
  if (options?.expectedNonce && payload.nonce !== options.expectedNonce) {
    throw new AppError('Nonce OpenID Connect invalide ou rejoué.', 401);
  }

  return {
    sub: payload.sub.trim(),
    email: payload.email.toLowerCase().trim(),
    firstName: payload.given_name || payload.name?.split(' ')[0] || 'Utilisateur',
    lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
    avatarUrl: payload.picture || undefined,
    emailVerified: true,
    iss: payload.iss,
    aud: Array.isArray(payload.aud) ? payload.aud[0] : payload.aud,
    azp: payload.azp,
    exp: payload.exp,
    nonce: payload.nonce,
  };
};
