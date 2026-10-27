// =========================================================================
// COMMERCIA — CONFIGURATION CENTRALISÉE DES MODULES, OFFRES ET MODES DE SUIVI
// =========================================================================

export type SubscriptionPlanId = 'free' | 'pro' | 'business';
export type TrackingModeId = 'simple' | 'avec_stock' | 'complet';

export interface PlanConfig {
  id: SubscriptionPlanId;
  name: string;
  badge?: string;
  priceMonthly: number;
  priceYearly: number;
  periodicityLabel: string;
  description: string;
  tagline: string;
  targetAudience: string;
  trialDays: number;
  maxDailySales: number; // -1 for unlimited
  maxPointsOfSale: number;
  maxUsers: number;
  includedModules: string[];
  features: string[];
  limitsSummary: string[];
  renewalConditions: string;
  activationNote: string;
}

export interface ManagementModeConfig {
  id: TrackingModeId;
  code: 'A' | 'B' | 'C';
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  features: string[];
  recommendedFor: string;
  iconName: string;
  defaultSettings: {
    enableStock: boolean;
    enableCredits: boolean;
  };
}

export interface ModuleConfig {
  id: string;
  name: string;
  shortDesc: string;
  longDesc: string;
  iconName: string;
  category: 'core' | 'operations' | 'growth' | 'enterprise';
  allowedPlans: SubscriptionPlanId[];
  isProOnly: boolean;
  autonomousSpace?: boolean;
  path?: string;
  features: string[];
  status: 'active' | 'beta' | 'included_free' | 'pro_required';
}

// -------------------------------------------------------------------------
// 1. MODES DE CONFIGURATION INITIALE (ÉTAPE 3 - GESTION)
// -------------------------------------------------------------------------
export const MANAGEMENT_MODES: ManagementModeConfig[] = [
  {
    id: 'simple',
    code: 'A',
    title: 'Gestion simplifiée',
    subtitle: 'Ventes, Dépenses & Marge estimée',
    badge: 'Essentiel & Rapide',
    description: 'Enregistrement ultra-rapide des flux sans inventaire lourd. Idéal pour débuter immédiatement.',
    features: [
      'Encaissement express au comptoir',
      'Saisie et catégorisation des dépenses',
      'Calcul automatique de la marge nette estimée',
      'Suivi financier de base & synthèse de caisse',
    ],
    recommendedFor: 'Commerce de services, snacking, micro-activités ou démarrage sans stock',
    iconName: 'Zap',
    defaultSettings: {
      enableStock: false,
      enableCredits: false,
    },
  },
  {
    id: 'avec_stock',
    code: 'B',
    title: 'Gestion commerciale avec stock',
    subtitle: 'Articles, Coûts, Stocks & Marges réelles',
    badge: 'Recommandé Commerces',
    description: 'Pilotage complet des marchandises avec prix de revient, alertes avant rupture et valorisation.',
    features: [
      'Catalogue d\'articles & codes produits',
      'Achats, coûts de revient & calcul de marge brute',
      'Gestion des stocks avec entrées / sorties',
      'Alertes automatiques de réapprovisionnement',
    ],
    recommendedFor: 'Boutiques, magasins de prêt-à-porter, quincailleries, épiceries et commerces physiques',
    iconName: 'Boxes',
    defaultSettings: {
      enableStock: true,
      enableCredits: false,
    },
  },
  {
    id: 'complet',
    code: 'C',
    title: 'Gestion complète',
    subtitle: 'Ventes, Caisse, Stocks, Crédits & Rapports',
    badge: 'Cockpit Intégral',
    description: 'Vision 360° de votre entreprise : flux de caisse, carnet de dettes clients, stocks et analyses avancées.',
    features: [
      'Ventes et clôture de caisse journalière',
      'Dépenses opérationnelles & charges fixes',
      'Gestion des stocks et alertes de seuil',
      'Carnet de crédits clients & relances',
      'Rapports d\'activité et fonctionnalités avancées autorisées',
    ],
    recommendedFor: 'Entrepreneurs organisés, PME commerciales et structures avec vente à terme',
    iconName: 'Rocket',
    defaultSettings: {
      enableStock: true,
      enableCredits: true,
    },
  },
];

// -------------------------------------------------------------------------
// 2. CATALOGUE CENTRALISÉ DES MODULES (SECTION 4 DE L'AUDIT)
// -------------------------------------------------------------------------
export const MODULES_CATALOG: ModuleConfig[] = [
  {
    id: 'stock_alerts',
    name: 'Gestion des stocks et alertes',
    shortDesc: 'Inventaire temps réel, seuils critiques et réapprovisionnements',
    longDesc: 'Suivez le niveau de stock en direct, prévenez les ruptures et calculez la valorisation de votre réserve.',
    iconName: 'Package',
    category: 'operations',
    allowedPlans: ['free', 'pro', 'business'], // Accessible dès le mode gestion avec_stock
    isProOnly: false,
    path: '/products',
    features: [
      'Suivi des mouvements d\'entrée/sortie',
      'Seuils d\'alerte personnalisables',
      'Calcul du coût unitaire moyen pondéré',
      'Valorisation financière du stock',
    ],
    status: 'included_free',
  },
  {
    id: 'customer_credits',
    name: 'Carnet de crédits clients',
    shortDesc: 'Suivi des créances, échéances et relances automatiques',
    longDesc: 'Évitez les impayés et sécurisez votre trésorerie grâce à un suivi rigoureux des clients débiteurs.',
    iconName: 'Users',
    category: 'operations',
    allowedPlans: ['free', 'pro', 'business'],
    isProOnly: false,
    path: '/customers',
    features: [
      'Fiches de créances par client',
      'Historique des paiements partiels',
      'Génération de messages de relance WhatsApp en 1 clic',
      'Alerte sur les échéances dépassées',
    ],
    status: 'included_free',
  },
  {
    id: 'commercial_lots',
    name: 'Gestion des lots commerciaux',
    shortDesc: 'Espace Pro autonome : campagnes d\'achat groupé, ballots, conteneurs',
    longDesc: 'Module indépendant hautement spécialisé pour les importateurs et grossistes : calcul des marges par campagne, dépenses annexes (douane, fret) et répartition du coût de revient par pièce.',
    iconName: 'Boxes',
    category: 'operations',
    allowedPlans: ['pro', 'business'],
    isProOnly: true,
    autonomousSpace: true,
    path: '/lots',
    features: [
      'Espace Pro autonome avec campagnes dédiées',
      'Prise en compte des frais d\'approche (transport, manutention, douane)',
      'Décomposition unitaire du coût de revient par article de lot',
      'Suivi de rentabilité globale par arrivage / ballot',
    ],
    status: 'pro_required',
  },
  {
    id: 'growth_cac',
    name: 'Croissance clients & CAC',
    shortDesc: 'Coût d\'acquisition client, canaux marketing et rentabilité',
    longDesc: 'Mesurez l\'efficacité de vos dépenses publicitaires (WhatsApp, Facebook, flyers) et suivez votre retour sur investissement.',
    iconName: 'TrendingUp',
    category: 'growth',
    allowedPlans: ['pro', 'business'],
    isProOnly: true,
    path: '/growth',
    features: [
      'Calcul automatique du Coût d\'Acquisition Client (CAC)',
      'Analyse des canaux d\'acquisition les plus rentables',
      'Mesure de la valeur à vie (Customer Lifetime Value)',
      'Recommandations d\'allocation budgétaire',
    ],
    status: 'pro_required',
  },
  {
    id: 'treasury_scenarios',
    name: 'Trésorerie et scénarios prévisionnels',
    shortDesc: 'Anticipation des trous de caisse, charges futures et simulations',
    longDesc: 'Visualisez l\'évolution future de vos liquidités pour ne jamais être pris au dépourvu lors des échéances de loyer ou fournisseurs.',
    iconName: 'Landmark',
    category: 'core',
    allowedPlans: ['pro', 'business'],
    isProOnly: true,
    path: '/treasury',
    features: [
      'Plan de trésorerie prévisionnel à 30 / 60 / 90 jours',
      'Simulations de scénarios en cas de baisse de ventes',
      'Calendrier des charges fixes et décaissements majeurs',
      'Alertes de tension de liquidités',
    ],
    status: 'pro_required',
  },
  {
    id: 'ai_copilot',
    name: 'Copilote IA COMMERCIA',
    shortDesc: 'Assistant financier intelligent, audit des marges et conseils stratégiques',
    longDesc: 'Un conseiller d\'entreprise disponible 24h/24 dans votre poche, analysant vos chiffres pour vous suggérer des actions concrètes.',
    iconName: 'Bot',
    category: 'growth',
    allowedPlans: ['pro', 'business'],
    isProOnly: true,
    path: '/copilot',
    features: [
      'Analyse en temps réel de vos marges et postes de coûts',
      'Détection des produits dormants et opportunités de prix',
      'Synthèses vocales et textuelles rédigées en français limpide',
      'Réponses personnalisées adaptées à votre secteur commercial',
    ],
    status: 'pro_required',
  },
  {
    id: 'deliveries_tracking',
    name: 'Livraisons et colis',
    shortDesc: 'Gestion des coursiers, expéditions interurbaines et colisage',
    longDesc: 'Gérez le cycle complet de livraison pour les ventes à distance avec suivi du statut et des encaissements à la livraison.',
    iconName: 'Truck',
    category: 'operations',
    allowedPlans: ['pro', 'business'],
    isProOnly: true,
    path: '/deliveries',
    features: [
      'Attribution aux coursiers et agences de transport',
      'Suivi des paiements contre remboursement (Cash on delivery)',
      'Statuts de livraison en temps réel (En attente, Expédié, Livré)',
      'Notification client par SMS / WhatsApp',
    ],
    status: 'pro_required',
  },
  {
    id: 'multi_stores_team',
    name: 'Multi-boutiques et gestion d\'équipe',
    shortDesc: 'Consolidation multi-points de vente, rôles gérants & caissiers',
    longDesc: 'Pilotez plusieurs boutiques ou succursales depuis une console centrale avec des caisses étanches et des droits d\'accès sécurisés.',
    iconName: 'Building2',
    category: 'enterprise',
    allowedPlans: ['business'],
    isProOnly: true,
    path: '/multi-stores',
    features: [
      'Gestion centralisée de multiples points de vente',
      'Comptes caissiers et gérants avec permissions cloisonnées',
      'Consolidation automatique du chiffre d\'affaires réseau',
      'Rapports d\'activité comparatifs par magasin',
    ],
    status: 'pro_required',
  },
];

// -------------------------------------------------------------------------
// 3. FORMULES D'ABONNEMENT (ÉTAPE 5 - FORMULE)
// -------------------------------------------------------------------------
export const PLANS_CONFIG: Record<SubscriptionPlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Plan Gratuit',
    badge: 'Découverte',
    priceMonthly: 0,
    priceYearly: 0,
    periodicityLabel: 'Gratuit à vie',
    description: 'Pour démarrer, tester la saisie simple des ventes au comptoir et poser les bases de votre gestion.',
    tagline: 'L\'essentiel pour structurer votre premier point de vente.',
    targetAudience: 'Micro-commerce ou démarrage d\'activité',
    trialDays: 0,
    maxDailySales: 15,
    maxPointsOfSale: 1,
    maxUsers: 1,
    includedModules: ['stock_alerts', 'customer_credits'],
    features: [
      '15 ventes par jour maximum',
      'Saisie des dépenses opérationnelles',
      'Calcul automatique de la marge de base',
      'Gestion de caisse journalière',
      'Support standard communautaire',
    ],
    limitsSummary: [
      'Plafonné à 15 ventes/jour',
      '1 seul point de vente',
      'Copilote IA et modules Pro verrouillés',
    ],
    renewalConditions: 'Sans engagement, gratuit de manière permanente.',
    activationNote: 'Activation immédiate. Aucun moyen de paiement requis.',
  },
  pro: {
    id: 'pro',
    name: 'Plan Pro',
    badge: 'Recommandé Commerces',
    priceMonthly: 4500,
    priceYearly: 45000,
    periodicityLabel: '4 500 FCFA / mois',
    description: 'Tous les outils professionnels pour accélérer votre croissance, sécuriser vos stocks et éliminer les fuites de caisse.',
    tagline: 'La formule complète pour rentabiliser votre activité au quotidien.',
    targetAudience: 'Boutiques actives, grossistes et commerces en expansion',
    trialDays: 30,
    maxDailySales: -1, // Illimité
    maxPointsOfSale: 1,
    maxUsers: 2,
    includedModules: [
      'stock_alerts',
      'customer_credits',
      'commercial_lots',
      'growth_cac',
      'treasury_scenarios',
      'ai_copilot',
      'deliveries_tracking',
    ],
    features: [
      'Ventes et encaissements illimités',
      'Stock en temps réel & alertes de rupture',
      'Carnet de créances clients & relances WhatsApp',
      'Gestion des lots commerciaux (espace autonome)',
      'Copilote IA financier interactif',
      'Trésorerie prévisionnelle & Croissance CAC',
      'Gestion des livraisons & expéditions',
    ],
    limitsSummary: [
      'Volume de ventes illimité',
      '1 point de vente principal (+ caisse secondaire)',
      'Accès complet à tous les modules Pro',
    ],
    renewalConditions: 'Sans engagement. Résiliation en 1 clic à tout moment depuis votre espace abonnement.',
    activationNote: 'Essai de 30 jours inclus sans prélèvement immédiat.',
  },
  business: {
    id: 'business',
    name: 'Plan Business',
    badge: 'Multi-Boutiques & Équipe',
    priceMonthly: 12000,
    priceYearly: 120000,
    periodicityLabel: '12 000 FCFA / mois',
    description: 'La solution haut de gamme pour piloter plusieurs boutiques, encadrer une équipe de caissiers et consolider vos bilans.',
    tagline: 'L\'architecture d\'entreprise pour réseaux et moyennes structures.',
    targetAudience: 'Entreprises établies, franchises et réseaux multi-boutiques',
    trialDays: 14,
    maxDailySales: -1,
    maxPointsOfSale: 5,
    maxUsers: 10,
    includedModules: [
      'stock_alerts',
      'customer_credits',
      'commercial_lots',
      'growth_cac',
      'treasury_scenarios',
      'ai_copilot',
      'deliveries_tracking',
      'multi_stores_team',
    ],
    features: [
      'Toutes les fonctionnalités du Plan Pro incluses',
      'Gestion de multiples boutiques étanches (jusqu\'à 5)',
      'Gestion d\'équipe avancée : rôles gérants & caissiers',
      'Rapports consolidés et exports PDF / Excel détaillés',
      'Copilote IA en mode prioritaire illimité',
      'Support client VIP WhatsApp dédié 7j/7',
    ],
    limitsSummary: [
      'Jusqu\'à 5 points de vente interconnectés',
      'Jusqu\'à 10 utilisateurs simultanés',
      'Assistance prioritaire 24/7',
    ],
    renewalConditions: 'Abonnement mensuel ou annuel avec facture certifiée.',
    activationNote: 'Activation instantanée avec accompagnement personnalisé.',
  },
};

// -------------------------------------------------------------------------
// 4. TRANCHES DE VOLUME JOURNALIER ESTIMÉ (ÉTAPE 4 - VOLUME)
// -------------------------------------------------------------------------
export const REVENUE_ESTIMATES = [
  {
    id: 'micro',
    label: 'Moins de 25 000 FCFA / jour',
    sub: 'Objectif de démarrage ou micro-point de vente',
    thresholdAlert: 10000,
  },
  {
    id: 'medium',
    label: '25 000 à 100 000 FCFA / jour',
    sub: 'Rythme de croisière régulier pour commerce de quartier',
    thresholdAlert: 30000,
  },
  {
    id: 'advanced',
    label: '100 000 à 500 000 FCFA / jour',
    sub: 'Boutique à forte rotation ou moyenne structure',
    thresholdAlert: 100000,
  },
  {
    id: 'scale',
    label: 'Plus de 500 000 FCFA / jour',
    sub: 'Entreprise établie ou gros volume de transactions',
    thresholdAlert: 300000,
  },
];

// -------------------------------------------------------------------------
// 5. SECTEURS D'ACTIVITÉ PRINCIPAUX (ÉTAPE 2 - SECTEUR)
// -------------------------------------------------------------------------
export const SECTORS = [
  {
    id: 'commerce',
    label: 'Boutique, épicerie et supérette',
    icon: '🏬',
    desc: 'Articles au détail, gestion des stocks et ravitaillement régulier',
    suggestedCategories: ['Marchandise', 'Transport / Ravitaillement', 'Loyer', 'Électricité', 'Emballages'],
  },
  {
    id: 'commerce_en_ligne',
    label: 'E-commerce et vente WhatsApp',
    icon: '🌐',
    desc: 'Commandes en ligne, livraisons, packaging et paiements Mobile Money',
    suggestedCategories: ['Publicité WhatsApp/Facebook', 'Frais de livraison', 'Emballage colis', 'Connexion Internet'],
  },
  {
    id: 'vente_vetements',
    label: 'Mode, prêt-à-porter et chaussures',
    icon: '👗',
    desc: 'Tailles, modèles, arrivages fréquents, ballots et marges saisonnières',
    suggestedCategories: ['Achat ballots/collections', 'Transport & fret', 'Pressing/Retouches', 'Sacs & étiquettes'],
  },
  {
    id: 'restaurant',
    label: 'Restaurant, fast-food et bar',
    icon: '🍲',
    desc: 'Gestion des consommations, ingrédients frais et caisse par service',
    suggestedCategories: ['Marché frais & viandes', 'Boissons & brasserie', 'Gaz & cuisson', 'Salaires personnel'],
  },
  {
    id: 'beaute',
    label: 'Salon de coiffure et cosmétique',
    icon: '✂️',
    desc: 'Prestations de soins combinées à la vente de produits capillaires',
    suggestedCategories: ['Produits de soins & mèches', 'Matériel de salon', 'Eau & électricité', 'Commissions coiffeurs'],
  },
  {
    id: 'artisanat',
    label: 'Artisanat, atelier et quincaillerie',
    icon: '🔨',
    desc: 'Matériaux, fabrication sur mesure et commandes par tranches',
    suggestedCategories: ['Matières premières', 'Outillage & quincaillerie', 'Consommables atelier', 'Transport charges'],
  },
  {
    id: 'services',
    label: 'Prestations de services et agence',
    icon: '💼',
    desc: 'Devis, honoraires, factures de service et règlements étalés',
    suggestedCategories: ['Sous-traitance', 'Déplacements clients', 'Abonnements logiciels', 'Fournitures de bureau'],
  },
  {
    id: 'autre',
    label: 'Autre activité spécifique',
    icon: '✨',
    desc: 'Configurez vos propres critères adaptés à votre modèle d\'affaires',
    suggestedCategories: ['Achats d\'exploitation', 'Frais généraux', 'Logistique', 'Divers'],
  },
];

// -------------------------------------------------------------------------
// 6. DEVISES DISPONIBLES (ÉTAPE 1 - IDENTITÉ)
// -------------------------------------------------------------------------
export const CURRENCIES = [
  { code: 'XAF', label: 'FCFA (Afrique Centrale - CEMAC)' },
  { code: 'XOF', label: 'FCFA (Afrique de l\'Ouest - UEMOA)' },
  { code: 'GNF', label: 'Franc Guinéen (GNF)' },
  { code: 'CDF', label: 'Franc Congolais (CDF)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'USD', label: 'Dollar US ($)' },
];
