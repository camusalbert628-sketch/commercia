// COMMERCIA Dynamic Promo Code Engine
// Centralizes discounts and promo validation across the entire application with server-side validation
import { api } from '../services/api';

export interface PromoRule {
  code: string;
  type: 'percent' | 'fixed';
  value: number; // e.g. 20 for 20%, 5000 for 5000 FCFA
  label: string;
  description: string;
}

export interface PromoServerValidation {
  isValid: boolean;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  discountAmount: number;
  finalAmount: number;
  message: string;
}

export const PROMO_REGISTRY: Record<string, PromoRule> = {
  COMMERCIA20: {
    code: 'COMMERCIA20',
    type: 'percent',
    value: 20,
    label: '-20% Réduction Immédiate',
    description: '20% de remise sur votre abonnement COMMERCIA',
  },
  BIENVENUE10: {
    code: 'BIENVENUE10',
    type: 'percent',
    value: 10,
    label: '-10% Bienvenue Commerçant',
    description: '10% de bienvenue pour tout nouvel abonné',
  },
  STARTUP50: {
    code: 'STARTUP50',
    type: 'percent',
    value: 50,
    label: '-50% Spécial Lancement',
    description: '50% de remise spéciale pour commerçants en phase de démarrage',
  },
  BIENVENUE5000: {
    code: 'BIENVENUE5000',
    type: 'fixed',
    value: 5000,
    label: '-5 000 FCFA Offerts',
    description: '5 000 FCFA déduits immédiatement sur votre facture',
  },
};

/**
 * Validation côté serveur en base de données
 */
export async function verifyPromoCodeWithServer(
  code: string,
  planName: 'pro' | 'business',
  billingCycle: 'monthly' | 'yearly' | 'mensuel' | 'annuel'
): Promise<PromoServerValidation> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return {
      isValid: false,
      code: '',
      discountType: 'percent',
      discountValue: 0,
      discountAmount: 0,
      finalAmount: 0,
      message: '',
    };
  }

  try {
    const res = await api.post<PromoServerValidation>('/payments/promo/validate', {
      code: cleanCode,
      planName,
      billingCycle,
    });
    return res;
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Code promotionnel non applicable ou non éligible à votre compte.';

    return {
      isValid: false,
      code: cleanCode,
      discountType: 'percent',
      discountValue: 0,
      discountAmount: 0,
      finalAmount: 0,
      message: errorMsg,
    };
  }
}

export function validatePromoCode(rawCode: string): { isValid: boolean; rule?: PromoRule; message: string } {
  const cleanCode = (rawCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return { isValid: false, message: '' };
  }

  const rule = PROMO_REGISTRY[cleanCode];
  if (rule) {
    return {
      isValid: true,
      rule,
      message: `Code ${rule.code} validé : ${rule.label} appliqué ! 🎉`,
    };
  }

  return {
    isValid: false,
    message: 'Code promotionnel invalide ou expiré.',
  };
}

export function calculateDiscountedPrice(basePrice: number, rawCode?: string): { finalPrice: number; discountAmount: number } {
  if (!rawCode) return { finalPrice: basePrice, discountAmount: 0 };
  const res = validatePromoCode(rawCode);
  if (!res.isValid || !res.rule) {
    return { finalPrice: basePrice, discountAmount: 0 };
  }

  if (res.rule.type === 'percent') {
    const discount = Math.round((basePrice * res.rule.value) / 100);
    return { finalPrice: Math.max(0, basePrice - discount), discountAmount: discount };
  } else {
    const discount = res.rule.value;
    return { finalPrice: Math.max(0, basePrice - discount), discountAmount: discount };
  }
}
