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
    allowedModules: [
      'stock_alerts',
      'customer_credits',
      'cash_journal',
      'commercial_lots',      // Espace autonome lots/ballots
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
      'Gestion des lots commerciaux et ballots',
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
      'Multi-boutiques & points de vente consolidés',
      'Gestion d\'équipe avec rôles gérant / caissier étanches',
      'Export comptable avancé & rapports multi-magasins',
      'Support prioritaire dédié 7j/7',
    ],
  },
};

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
