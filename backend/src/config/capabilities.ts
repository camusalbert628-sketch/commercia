/**
 * COMMERCIA — MATRICE CENTRALE DES CAPACITÉS ET DROITS D'ABONNEMENT
 * Définit rigoureusement les quotas et les modules autorisés pour chaque plan (Free, Pro, Business).
 */

export type PlanTier = 'free' | 'pro' | 'business';

export interface PlanCapabilities {
  tier: PlanTier;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
  maxDailySales: number; // -1 pour illimité
  maxPointsOfSale: number;
  maxUsers: number;
  maxCommercialLotCampaigns: number; // 4 pour Pro, -1 pour Business (illimité)
  allowedModules: string[];
  features: string[];
}

export const CAPABILITIES: Record<PlanTier, PlanCapabilities> = {
  free: {
    tier: 'free',
    displayName: 'Plan Gratuit',
    priceMonthly: 0,
    priceYearly: 0,
    maxDailySales: 15,
    maxPointsOfSale: 1,
    maxUsers: 1,
    maxCommercialLotCampaigns: 0,
    allowedModules: [
      'stock_alerts',
      'customer_credits',
      'cash_journal',
      'food_preparation', // Découverte métier restauration
      'service_orders',   // Découverte métier prestations/couture
      'mobile_money_ops', // Découverte métier guichet
    ],
    features: [
      '15 ventes par jour maximum',
      'Saisie des dépenses de base',
      'Caisse journalière',
      'Découverte des modules métiers',
    ],
  },
  pro: {
    tier: 'pro',
    displayName: 'Plan Pro',
    priceMonthly: 4500,
    priceYearly: 45000,
    maxDailySales: -1,
    maxPointsOfSale: 1,
    maxUsers: 3,
    maxCommercialLotCampaigns: 4, // Quota strict de 4 campagnes pour le Plan Pro
    allowedModules: [
      'stock_alerts',
      'customer_credits',
      'cash_journal',
      'commercial_lots',      // Espace autonome lots/ballots (max 4 campagnes)
      'growth_cac',           // Métriques CAC et rentabilité canaux
      'treasury_scenarios',   // Prévisions de trésorerie
      'deliveries_tracking',  // Livraisons & colis
      'ai_copilot',           // Copilote IA
      'food_preparation',
      'service_orders',
      'mobile_money_ops',
    ],
    features: [
      'Ventes et encaissements illimités',
      'Gestion complète des stocks & alertes ruptures',
      'Carnet de créances & relances WhatsApp 1-clic',
      'Gestion des lots commerciaux et ballots (jusqu’à 4 campagnes)',
      'Livraisons et expéditions de colis',
      'Trésorerie prévisionnelle & Croissance CAC',
      'Copilote IA COMMERCIA',
    ],
  },
  business: {
    tier: 'business',
    displayName: 'Plan Business',
    priceMonthly: 12000,
    priceYearly: 120000,
    maxDailySales: -1,
    maxPointsOfSale: 5,
    maxUsers: 10,
    maxCommercialLotCampaigns: -1, // Illimité (au-delà de 4 campagnes)
    allowedModules: [
      'stock_alerts',
      'customer_credits',
      'cash_journal',
      'commercial_lots',
      'growth_cac',
      'treasury_scenarios',
      'deliveries_tracking',
      'ai_copilot',
      'multi_stores_team',    // Multi-boutiques & caissiers
      'food_preparation',
      'service_orders',
      'mobile_money_ops',
    ],
    features: [
      'Tout le plan Pro',
      'Campagnes de gestion des lots & ballots illimitées (au-delà de 4)',
      'Multi-boutiques & points de vente consolidés',
      'Gestion d\'équipe avec rôles gérant / caissier étanches',
      'Export comptable avancé & rapports multi-magasins',
      'Support prioritaire dédié 7j/7',
    ],
  },
};

/**
 * Retourne le nombre maximum de campagnes de lots autorisées pour un forfait
 * -1 = illimité (Plan Business)
 */
export function getMaxCommercialLotCampaigns(plan: PlanTier): number {
  const cap = CAPABILITIES[plan] || CAPABILITIES.free;
  return cap.maxCommercialLotCampaigns;
}

/**
 * Vérifie si un plan a le droit d'activer un module donné
 */
export function canPlanAccessModule(plan: PlanTier, moduleId: string): boolean {
  const cap = CAPABILITIES[plan] || CAPABILITIES.free;
  return cap.allowedModules.includes(moduleId);
}

/**
 * Filtre une liste de modules demandés pour ne garder que ceux autorisés par le plan de l'utilisateur
 */
export function filterModulesByPlan(plan: PlanTier, requestedModules: string[]): string[] {
  const cap = CAPABILITIES[plan] || CAPABILITIES.free;
  return requestedModules.filter(m => cap.allowedModules.includes(m));
}
