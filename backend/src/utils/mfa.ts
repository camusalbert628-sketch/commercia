import crypto from 'crypto';

/**
 * Moteur TOTP (Time-Based One-Time Password - RFC 6238) natif en Node.js
 * Utilise l'algorithme HMAC-SHA1 avec fenêtre temporelle de 30 secondes.
 * Ne dépend d'aucune bibliothèque externe vulnérable.
 */

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encode un Buffer en Base32
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Décode une chaîne Base32 en Buffer
 */
export function base32Decode(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleaned[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Génère un secret TOTP aléatoire et cryptographiquement sécurisé (160 bits / 20 octets)
 */
export function generateTotpSecret(): { secret: string; otpauthUrl: string } {
  const buffer = crypto.randomBytes(20);
  const secret = base32Encode(buffer);
  const issuer = 'COMMERCIA';
  const label = encodeURIComponent(`COMMERCIA:Admin`);
  const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

  return { secret, otpauthUrl };
}

/**
 * Calcule le code TOTP à 6 chiffres pour un secret et un pas de temps donné
 */
export function computeTotpCode(secretBase32: string, timeStep: number): string {
  const key = base32Decode(secretBase32);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const digest = hmac.digest();

  // Dynamic truncation (RFC 4226)
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, '0');
  return otp;
}

/**
 * Vérifie la validité d'un code TOTP fourni par l'utilisateur
 * Autorise une tolérance de ±1 pas de temps (±30s) pour compenser la dérive d'horloge.
 */
export function verifyTotpCode(token: string, secretBase32: string): boolean {
  if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
    return false;
  }

  const currentStep = Math.floor(Date.now() / 1000 / 30);

  // Vérifier la fenêtre courante, passée et future
  for (let delta = -1; delta <= 1; delta++) {
    const expected = computeTotpCode(secretBase32, currentStep + delta);
    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}

/**
 * Génère une liste de 8 codes de récupération à usage unique (hachés en SHA-256)
 */
export function generateRecoveryCodes(): { plainCodes: string[]; hashedCodes: string[] } {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < 8; i++) {
    const code = `${crypto.randomBytes(4).toString('hex')}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase();
    plainCodes.push(code);
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    hashedCodes.push(hash);
  }

  return { plainCodes, hashedCodes };
}
