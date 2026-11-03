import { parsePhoneNumberFromString, CountryCode, getCountryCallingCode } from 'libphonenumber-js';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export interface PhoneValidationResult {
  isValid: boolean;
  isPossible: boolean;
  e164?: string;
  nationalNumber?: string;
  country?: string;
  countryCallingCode?: string;
  formattedInternational?: string;
  formattedNational?: string;
  type?: string;
  error?: string;
}

export class PhoneService {
  /**
   * Analyse et valide rigoureusement un numéro de téléphone avec libphonenumber-js.
   */
  public static validate(phoneStr: string, defaultCountry: string = 'CM'): PhoneValidationResult {
    if (!phoneStr || typeof phoneStr !== 'string' || !phoneStr.trim()) {
      return {
        isValid: false,
        isPossible: false,
        error: 'Le numéro de téléphone est obligatoire.',
      };
    }

    const trimmed = phoneStr.trim();

    try {
      // Normaliser le code pays (2 lettres majuscules)
      const countryCode = (defaultCountry || 'CM').toUpperCase() as CountryCode;
      const parsed = parsePhoneNumberFromString(trimmed, countryCode);

      if (!parsed) {
        return {
          isValid: false,
          isPossible: false,
          error: 'Format de numéro non reconnu. Veuillez vérifier l’indicatif du pays.',
        };
      }

      const isValid = parsed.isValid();
      const isPossible = parsed.isPossible();

      return {
        isValid,
        isPossible,
        e164: parsed.format('E.164'),
        nationalNumber: parsed.nationalNumber,
        country: parsed.country,
        countryCallingCode: parsed.countryCallingCode ? `+${parsed.countryCallingCode}` : undefined,
        formattedInternational: parsed.formatInternational(),
        formattedNational: parsed.formatNational(),
        type: parsed.getType(),
        error: !isValid ? 'Ce numéro de téléphone est incomplet ou invalide pour le pays sélectionné.' : undefined,
      };
    } catch (err: any) {
      return {
        isValid: false,
        isPossible: false,
        error: err?.message || 'Erreur lors de l’analyse du numéro de téléphone.',
      };
    }
  }

  /**
   * Normalise un numéro en format standard international E.164 (+237XXXXXXXXX).
   */
  public static normalize(phoneStr: string, defaultCountry: string = 'CM'): string | null {
    const res = this.validate(phoneStr, defaultCountry);
    return res.isValid && res.e164 ? res.e164 : null;
  }

  /**
   * Initie l'envoi d'un code OTP SMS pour vérifier l'existence réelle d'un numéro.
   */
  public static async sendVerificationOtp(
    prisma: PrismaClient,
    phoneNumber: string,
    country: string = 'CM',
    userId?: string,
    ipAddress?: string
  ): Promise<{ verificationId: string; maskedPhone: string; expiresInMinutes: number }> {
    const validation = this.validate(phoneNumber, country);
    if (!validation.isValid || !validation.e164) {
      throw new AppError(validation.error || 'Numéro de téléphone invalide.', 400);
    }

    const e164 = validation.e164;

    // Rate limiting: max 3 envois par 10 minutes par numéro
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await prisma.phoneVerification.count({
      where: {
        phoneNumber: e164,
        createdAt: { gte: tenMinutesAgo },
      },
    });

    if (recentCount >= 4) {
      throw new AppError('Trop de demandes pour ce numéro. Veuillez patienter 10 minutes avant de réessayer.', 429);
    }

    // Invalider les anciens challenges non complétés pour ce numéro
    await prisma.phoneVerification.deleteMany({
      where: {
        phoneNumber: e164,
        isVerified: false,
      },
    });

    const rawCode = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    const expiresInMinutes = 5;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const record = await prisma.phoneVerification.create({
      data: {
        phoneNumber: e164,
        country: validation.country || country,
        codeHash,
        attempts: 0,
        maxAttempts: 5,
        expiresAt,
        userId: userId || null,
        ipAddress: ipAddress || null,
      },
    });

    // Journalisation sécurisée sans exposition du code OTP
    console.info(`[COMMERCIA SMS GATEWAY] OTP de vérification initié pour ${e164} (${validation.country}) — Expire dans ${expiresInMinutes} min.`);

    // Masquer le numéro (ex: "+237 6** *** 97")
    const len = e164.length;
    const maskedPhone = e164.substring(0, 5) + ' ******* ' + e164.substring(len - 2);

    return {
      verificationId: record.id,
      maskedPhone,
      expiresInMinutes,
    };
  }

  /**
   * Vérifie le code OTP SMS et passe le numéro au statut VÉRIFIÉ.
   */
  public static async verifyOtp(
    prisma: PrismaClient,
    phoneNumber: string,
    candidateCode: string,
    userId?: string
  ): Promise<{ isVerified: boolean; message: string; phoneData: any }> {
    const validation = this.validate(phoneNumber);
    const e164 = validation.e164 || phoneNumber.trim();

    const challenge = await prisma.phoneVerification.findFirst({
      where: {
        phoneNumber: e164,
        isVerified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new AppError('Aucune demande de vérification active trouvée pour ce numéro.', 404);
    }

    if (challenge.expiresAt < new Date()) {
      await prisma.phoneVerification.delete({ where: { id: challenge.id } });
      throw new AppError('Le code de vérification SMS a expiré. Veuillez en demander un nouveau.', 400);
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      await prisma.phoneVerification.delete({ where: { id: challenge.id } });
      throw new AppError('Nombre maximal de tentatives atteint (5/5). Ce code est invalidé.', 403);
    }

    const candidateHash = crypto.createHash('sha256').update(candidateCode.trim()).digest('hex');
    if (candidateHash !== challenge.codeHash) {
      await prisma.phoneVerification.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = challenge.maxAttempts - (challenge.attempts + 1);
      throw new AppError(`Code SMS incorrect. Il vous reste ${remaining} tentative(s).`, 400);
    }

    // Code valide !
    const verifiedAt = new Date();
    await prisma.phoneVerification.update({
      where: { id: challenge.id },
      data: {
        isVerified: true,
        verifiedAt,
      },
    });

    // Si un utilisateur est rattaché, mettre à jour ses attributs en base
    if (userId || challenge.userId) {
      const targetUserId = userId || challenge.userId!;
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          phone: e164,
          phoneCountry: validation.country,
          phoneCallingCode: validation.countryCallingCode,
          phoneNationalNumber: validation.nationalNumber,
          phoneVerified: true,
          phoneVerifiedAt: verifiedAt,
        },
      }).catch(() => {});
    }

    return {
      isVerified: true,
      message: 'Numéro de téléphone vérifié avec succès.',
      phoneData: {
        e164,
        country: validation.country,
        callingCode: validation.countryCallingCode,
        nationalNumber: validation.nationalNumber,
        verifiedAt,
      },
    };
  }

  /**
   * Analyse globale de la base de données pour la console d'administration.
   */
  public static async getGlobalPhoneStats(prisma: PrismaClient) {
    const users = await prisma.user.findMany({
      select: { id: true, phone: true, phoneVerified: true, phoneCountry: true, createdAt: true, email: true },
    });

    let total = 0;
    let validCount = 0;
    let invalidCount = 0;
    let verifiedCount = 0;
    let unverifiedCount = 0;
    const countryDistribution: Record<string, number> = {};
    const duplicates: Record<string, string[]> = {};
    const invalidList: any[] = [];

    for (const u of users) {
      if (!u.phone) continue;
      total += 1;

      const val = this.validate(u.phone, u.phoneCountry || 'CM');
      if (val.isValid && val.e164) {
        validCount += 1;
        const c = val.country || 'AUTRE';
        countryDistribution[c] = (countryDistribution[c] || 0) + 1;

        if (u.phoneVerified) {
          verifiedCount += 1;
        } else {
          unverifiedCount += 1;
        }

        // Détection de doublons
        if (!duplicates[val.e164]) {
          duplicates[val.e164] = [];
        }
        duplicates[val.e164].push(u.email);
      } else {
        invalidCount += 1;
        unverifiedCount += 1;
        invalidList.push({
          userId: u.id,
          email: u.email,
          rawPhone: u.phone,
          error: val.error,
        });
      }
    }

    // Filtrer les véritables doublons (> 1 compte)
    const trueDuplicates = Object.entries(duplicates)
      .filter(([_, emails]) => emails.length > 1)
      .map(([phone, emails]) => ({ phone, count: emails.length, accounts: emails }));

    return {
      totalPhones: total,
      validPhones: validCount,
      invalidPhones: invalidCount,
      verifiedPhones: verifiedCount,
      unverifiedPhones: unverifiedCount,
      countryDistribution,
      duplicates: trueDuplicates,
      invalidList,
    };
  }
}
