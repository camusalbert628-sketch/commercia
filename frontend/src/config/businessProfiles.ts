// =========================================================================
// COMMERCIA FRONTEND — CONFIGURATION OFFICIELLE DES 20 PROFILS MÉTIERS & 6 FAMILLES
// =========================================================================

export type BusinessProfileFamily =
  | 'commerce'
  | 'production'
  | 'services_rdv'
  | 'commandes_travaux'
  | 'distribution'
  | 'transactions';

export type BusinessProfileId =
  // Famille 1 : Commerce et revente (8)
  | 'epicerie_alimentation'
  | 'friperie_vetements'
  | 'cosmetiques'
  | 'telephonie_accessoires'
  | 'chaussures_sacs'
  | 'quincaillerie'
  | 'librairie_papeterie'
  | 'produits_menagers'
  // Famille 2 : Production et transformation (4)
  | 'restauration_repas'
  | 'boulangerie_patisserie'
  | 'fruits_legumes'
  | 'produits_surgeles'
  // Famille 3 : Prestations et rendez-vous (2)
  | 'salon_coiffure_barbier'
  | 'institut_beaute'
  // Famille 4 : Commandes et travaux (3)
  | 'atelier_couture'
  | 'reparation_telephones_info'
  | 'garage_mecanique'
  // Famille 5 : Gros, distribution et logistique (1)
  | 'depot_boissons_distribution'
  // Famille 6 : Transactions et services professionnels (2)
  | 'agence_mobile_money'
  | 'services_agence_digitale';

export interface BusinessProfileConfig {
  id: BusinessProfileId;
  name: string;
  family: BusinessProfileFamily;
  familyName: string;
  emoji: string;
  iconName: string;
  tagline: string;
  description: string;
  typicalNeeds: string[];
  recommendedModules: string[];
  defaultTrackingMode: 'simple' | 'avec_stock' | 'complet';
  terminology: {
    salesNav: string;
    saleSingle: string;
    itemsLabel: string;
    customerLabel: string;
    quickActionSale: string;
    expenseNav?: string;
    inventoryNav?: string;
  };
  dashboardKpis: Array<{
    id: string;
    label: string;
    desc: string;
    isProOnly?: boolean;
  }>;
  defaultExpenseCategories: Array<{
    name: string;
    icon: string;
  }>;
  customFields?: Array<{
    id: string;
    label: string;
    type: 'text' | 'number' | 'select';
    placeholder?: string;
    options?: string[];
  }>;
}

export const BUSINESS_FAMILIES: Record<BusinessProfileFamily, { name: string; emoji: string; description: string }> = {
  commerce: {
    name: 'Commerce et revente',
    emoji: '🏬',
    description: 'Boutiques, magasins physiques et vente d’articles au détail ou semi-gros.',
  },
  production: {
    name: 'Production et transformation',
    emoji: '🍲',
    description: 'Restauration, boulangerie, denrées fraîches et transformation alimentaire.',
  },
  services_rdv: {
    name: 'Prestations et soins',
    emoji: '✂️',
    description: 'Salons de coiffure, barbiers, soins esthétiques et prestations individuelles.',
  },
  commandes_travaux: {
    name: 'Commandes, confection et travaux',
    emoji: '🪡',
    description: 'Ateliers de couture, réparations électroniques, garages et chantiers sur devis.',
  },
  distribution: {
    name: 'Gros, distribution et logistique',
    emoji: '🚚',
    description: 'Dépôts de boissons, approvisionnement grossiste et gestion de tournées.',
  },
  transactions: {
    name: 'Transactions & Services professionnels',
    emoji: '📱',
    description: 'Agences Mobile Money, transfert de fonds et agences de services digitaux.',
  },
};

export const BUSINESS_PROFILES: Record<BusinessProfileId, BusinessProfileConfig> = {
  // ---------------------------------------------------------------------------
  // FAMILLE 1 : COMMERCE ET REVENTE
  // ---------------------------------------------------------------------------
  epicerie_alimentation: {
    id: 'epicerie_alimentation',
    name: 'Épicerie et alimentation générale',
    family: 'commerce',
    familyName: 'Commerce et revente',
    emoji: '🛒',
    iconName: 'Store',
    tagline: 'Vente rapide au comptoir, rotation quotidienne et alertes de réapprovisionnement.',
    description: 'Supérette, alimentation générale, étals de quartier avec articles au détail et encaissements fréquents.',
    typicalNeeds: [
      'Encaissement ultra-rapide au comptoir',
      'Suivi des stocks & alertes avant rupture',
      'Carnet des crédits clients de quartier',
      'Clôture journalière de caisse précise',
    ],
    recommendedModules: ['stock_alerts', 'customer_credits', 'cash_journal'],
    defaultTrackingMode: 'avec_stock',
    terminology: {
      salesNav: 'Ventes comptoir',
      saleSingle: 'Vente',
      itemsLabel: 'Articles & Denrées',
      customerLabel: 'Client',
      quickActionSale: 'Nouvelle vente comptoir',
    },
    dashboardKpis: [
      { id: 'revenue', label: 'Chiffre d’affaires', desc: 'Total des ventes enregistrées' },
      { id: 'cogs', label: 'Coût des marchandises', desc: 'Prix de revient du stock vendu' },
      { id: 'grossProfit', label: 'Marge brute', desc: 'Chiffre d’affaires moins le coût d’achat' },
      { id: 'netCashFlow', label: 'Trésorerie nette', desc: 'Argent liquide et MoMo réellement perçu' },
      { id: 'receivables', label: 'Crédits clients en cours', desc: 'Dettes à recouvrer' },
    ],
    defaultExpenseCategories: [
      { name: 'Achat Marchandise & Stock', icon: '🏬' },
      { name: 'Transport & Ravitaillement', icon: '🚚' },
      { name: 'Loyer boutique', icon: '🏠' },
      { name: 'Électricité & Froid', icon: '💡' },
      { name: 'Sacs & Emballages', icon: '🛍️' },
      { name: 'Pertes & Produits périmés', icon: '⚠️' },
    ],
  },

  friperie_vetements: {
    id: 'friperie_vetements',
    name: 'Friperie et vente de vêtements',
    family: 'commerce',
    familyName: 'Commerce et revente',
    emoji: '👗',
    iconName: 'Boxes',
    tagline: 'Gestion des ballots, tri par catégories, pièces vendables et rentabilité par arrivage.',
    description: 'Prêt-à-porter, friperie de premier choix, déballage de ballots (bales) et vente WhatsApp / boutique.',
    typicalNeeds: [
      'Gestion des ballots et calcul du coût de revient par pièce',
      'Prise en compte des frais d’approche (fret, blanchisserie, retouches)',
      'Suivi des pièces vendues, restantes et passées en perte',
      'Ventes multicanales (Boutique, WhatsApp, Live Facebook)',
    ],
    recommendedModules: ['commercial_lots', 'stock_alerts', 'customer_credits', 'deliveries_tracking', 'growth_cac'],
    defaultTrackingMode: 'avec_stock',
    terminology: {
      salesNav: 'Ventes & Déballages',
      saleSingle: 'Vente vêtement',
      itemsLabel: 'Pièces & Modèles',
      customerLabel: 'Client',
      quickActionSale: 'Vente de vêtements',
    },
    dashboardKpis: [
      { id: 'lotProfitability', label: 'Rentabilité des ballots', desc: 'Bénéfice net réalisé par ballot déballé' },
      { id: 'capitalRecovery', label: 'Récupération du capital', desc: '% du coût d’achat déjà encaissé' },
      { id: 'stockRemainingValue', label: 'Valeur du stock restant', desc: 'Valeur marchande des pièces en rayon' },
      { id: 'defectiveLosses', label: 'Avaries & Invendables', desc: 'Coût des pièces défectueuses passées en perte' },
    ],
    defaultExpenseCategories: [
      { name: 'Achat Ballot / Bales', icon: '📦' },
      { name: 'Transport & Dédouanement', icon: '🚚' },
      { name: 'Pressing, Lavage & Tri', icon: '🧼' },
      { name: 'Cintres, Sacs & Étiquettes', icon: '🏷️' },
      { name: 'Loyer & Étalage', icon: '🏠' },
      { name: 'Publicité & Livraisons', icon: '📣' },
    ],
  },

  cosmetiques: {
    id: 'cosmetiques',
    name: 'Boutique de cosmétiques et beauté',
    family: 'commerce',
    familyName: 'Commerce et revente',
    emoji: '💄',
    iconName: 'Sparkles',
    tagline: 'Gammes de soins, parfums, produits capillaires et fidélisation client.',
    description: 'Distribution de produits de beauté, crèmes, sérums, perruques et accessoires capillaires.',
    typicalNeeds: [
      'Gestion fine des stocks avec variantes (teintes, contenances)',
      'Suivi des marges confortables et des produits à forte rotation',
      'Livraisons urbaines par coursiers',
      'Paiements d’avances sur commandes spécifiques',
    ],
    recommendedModules: ['stock_alerts', 'deliveries_tracking', 'growth_cac', 'customer_credits'],
    defaultTrackingMode: 'avec_stock',
    terminology: {
      salesNav: 'Ventes cosmétiques',
      saleSingle: 'Vente produit',
      itemsLabel: 'Soins & Produits',
      customerLabel: 'Cliente',
      quickActionSale: 'Nouvelle vente beauté',
    },
    dashboardKpis: [
      { id: 'revenue', label: 'Chiffre d’affaires', desc: 'Total des ventes' },
      { id: 'grossMarginPercent', label: 'Taux de marge brute', desc: 'Rentabilité moyenne des produits' },
      { id: 'topSelling', label: 'Top produits vendus', desc: 'Articles phares de la période' },
      { id: 'lowStockAlert', label: 'Ruptures imminentes', desc: 'Produits sous le seuil d’alerte' },
    ],
    defaultExpenseCategories: [
      { name: 'Approvisionnement cosmétiques', icon: '🧴' },
      { name: 'Frais de transport & coursiers', icon: '🛵' },
      { name: 'Emballages & Packaging cadeaux', icon: '🎁' },
      { name: 'Publicité Instagram / TikTok', icon: '📱' },
      { name: 'Loyer boutique', icon: '🏠' },
    ],
  },

  telephonie_accessoires: {
    id: 'telephonie_accessoires',
    name: 'Vente de téléphones et accessoires',
    family: 'commerce',
    familyName: 'Commerce et revente',
    emoji: '📱',
    iconName: 'Smartphone',
    tagline: 'Appareils neufs et reconditionnés, coques, chargeurs et pose d’écrans.',
    description: 'Commerce de smartphones, tablettes, écouteurs, accessoires high-tech et petites réparations.',
    typicalNeeds: [
      'Suivi du stock par modèle, mémoire et couleur',
      'Traçabilité des numéros IMEI ou numéros de série',
      'Distinction entre vente d’accessoires et vente d’appareils',
      'Gestion des acomptes et règlements échelonnés',
    ],
    recommendedModules: ['stock_alerts', 'customer_credits', 'service_orders', 'cash_journal'],
    defaultTrackingMode: 'avec_stock',
    terminology: {
      salesNav: 'Ventes téléphones & accessoires',
      saleSingle: 'Vente appareil/accessoire',
      itemsLabel: 'Téléphones & Accessoires',
      customerLabel: 'Client',
      quickActionSale: 'Nouvelle vente mobile',
    },
    dashboardKpis: [
      { id: 'revenue', label: 'Chiffre d’affaires', desc: 'Total des ventes high-tech' },
      { id: 'grossProfit', label: 'Bénéfice brut', desc: 'Marge dégagée' },
      { id: 'creditSales', label: 'Ventes à crédit / Traites', desc: 'Soldes restant à payer' },
      { id: 'stockValue', label: 'Valeur du parc en stock', desc: 'Montant immobilisé en téléphones' },
    ],
    defaultExpenseCategories: [
      { name: 'Achat téléphones (Neufs / Occasions)', icon: '📱' },
      { name: 'Accessoires (Coques, Chargeurs, Écrans)', icon: '🔌' },
      { name: 'Pièces de rechange & Outils', icon: '🛠️' },
      { name: 'Loyer boutique', icon: '🏠' },
      { name: 'Électricité & Connexion', icon: '💡' },
    ],
  },

  chaussures_sacs: {
    id: 'chaussures_sacs',
    name: 'Vente de chaussures et sacs',
    family: 'commerce',
    familyName: 'Commerce et revente',
    emoji: '👠',
    iconName: 'ShoppingBag',
    tagline: 'Pointures, arrivages tendance, collections saisonnières et expéditions.',
    description: 'Boutique de maroquinerie, baskets, escarpins, sacs à dos et sacs à main.',
    typicalNeeds: [
      'Gestion des pointures et coloris par modèle',
      'Campagnes d’arrivages et liquidation des séries incomplètes',
      'Gestion des réservations avec acompte',
      'Expéditions interurbaines par agences de voyage',
    ],
    recommendedModules: ['stock_alerts', 'deliveries_tracking', 'growth_cac', 'cash_journal'],
    defaultTrackingMode: 'avec_stock',
    terminology: {
      salesNav: 'Ventes chaussures & maroquinerie',
      saleSingle: 'Vente paire/sac',
      itemsLabel: 'Modèles & Pointures',
      customerLabel: 'Client',
      quickActionSale: 'Vente chaussures/sac',
    },
    dashboardKpis: [
      { id: 'revenue', label: 'Chiffre d’affaires', desc: 'Ventes totales' },
      { id: 'avgBasket', label: 'Panier moyen', desc: 'Montant moyen par client' },
      { id: 'slowMovers', label: 'Pointures restantes', desc: 'Articles à écouler' },
      { id: 'netCashFlow', label: 'Cash disponible', desc: 'Solde réel en caisse' },
    ],
    defaultExpenseCategories: [
      { name: 'Achats collections & paires', icon: '👞' },
      { name: 'Fret, Transport & Douane', icon: '✈️' },
      { name: 'Emballages & Boîtes de chaussures', icon: '📦' },
      { name: 'Loyer vitrine', icon: '🏠' },
      { name: 'Frais d’expédition colis', icon: '🚚' },
    ],
  },

  quincaillerie: {
    id: 'quincaillerie',
    name: 'Quincaillerie et matériaux',
    family: 'commerce',
    familyName: 'Commerce et revente',
    emoji: '🔩',
    iconName: 'Wrench',
    tagline: 'Ciment, fer, tuyauterie, peinture, outillage et devis de chantier.',
    description: 'Commerce de gros et détail de matériaux de construction, plomberie, électricité et outillage professionnel.',
    typicalNeeds: [
      'Gestion d’un inventaire volumineux avec unités diverses (sac, mètre, barre, boîte)',
      'Gestion des gros comptes clients chantiers avec vente à crédit',
      'Facturation de transport et frais de manutention/chargement',
      'Suivi des dettes fournisseurs industriels',
    ],
    recommendedModules: ['stock_alerts', 'customer_credits', 'cash_journal', 'treasury_scenarios'],
    defaultTrackingMode: 'avec_stock',
    terminology: {
      salesNav: 'Ventes matériaux & outillage',
      saleSingle: 'Bon de vente / Facture',
      itemsLabel: 'Matériaux & Articles',
      customerLabel: 'Client / Entrepreneur',
      quickActionSale: 'Nouveau bon de quincaillerie',
    },
    dashboardKpis: [
      { id: 'revenue', label: 'Chiffre d’affaires', desc: 'Total matériaux vendus' },
      { id: 'receivables', label: 'Créances chantiers', desc: 'Dettes clients à relancer' },
      { id: 'cogs', label: 'Coût d’achat fournisseurs', desc: 'Coût des matériaux vendus' },
      { id: 'grossProfit', label: 'Marge brute', desc: 'Marge commerciale réalisée' },
    ],
    defaultExpenseCategories: [
      { name: 'Approvisionnement usine / grossiste', icon: '🏗️' },
      { name: 'Transport poids lourd & déchargement', icon: '🚛' },
      { name: 'Main-d’œuvre manutention', icon: '👷' },
      { name: 'Loyer hangar & magasin', icon: '🏢' },
      { name: 'Pertes & Casse matériaux', icon: '🔨' },
    ],
  },

  librairie_papeterie: {
    id: 'librairie_papeterie',
    name: 'Librairie et fournitures scolaires',
    family: 'commerce',
    familyName: 'Commerce et revente',
    emoji: '📚',
    iconName: 'BookOpen',
    tagline: 'Manuels scolaires, cahiers, stylos, photocopies et pic de rentrée scolaire.',
    description: 'Librairie de quartier, papeterie de bureau, fournitures académiques et services de reprographie.',
    typicalNeeds: [
      'Gestion des listes scolaires et packs de rentrée',
      'Gestion des articles à bas prix unitaire et gros volumes (cahiers, stylos)',
      'Suivi des services annexes (photocopies, plastification, reliure)',
      'Anticipation de la haute saison de rentrée',
    ],
    recommendedModules: ['stock_alerts', 'customer_credits', 'cash_journal'],
    defaultTrackingMode: 'avec_stock',
    terminology: {
      salesNav: 'Ventes fournitures & livres',
      saleSingle: 'Vente papeterie',
      itemsLabel: 'Livres, Cahiers & Fournitures',
      customerLabel: 'Parent / Élève / Entreprise',
      quickActionSale: 'Vente fournitures',
    },
    dashboardKpis: [
      { id: 'revenue', label: 'Chiffre d’affaires', desc: 'Ventes papeterie et reprographie' },
      { id: 'grossProfit', label: 'Marge brute', desc: 'Marge commerciale' },
      { id: 'netCashFlow', label: 'Cash encaissé', desc: 'Total liquidités' },
      { id: 'stockAlert', label: 'Titres à réapprovisionner', desc: 'Livres sous le seuil' },
    ],
    defaultExpenseCategories: [
      { name: 'Achat manuels & papeterie', icon: '📚' },
      { name: 'Rames de papier & toners photocopieuse', icon: '🖨️' },
      { name: 'Transport & courses éditeurs', icon: '🚚' },
      { name: 'Loyer librairie', icon: '🏠' },
      { name: 'Électricité machine', icon: '💡' },
    ],
  },

  produits_menagers: {
    id: 'produits_menagers',
    name: 'Produits ménagers et entretien',
    family: 'commerce',
    familyName: 'Commerce et revente',
    emoji: '🧼',
    iconName: 'Shield',
    tagline: 'Savons, détergents, javel, balais, éponges et produits d’hygiène.',
    description: 'Vente de détergents en vrac ou conditionnés, produits d’entretien pour maisons et entreprises.',
    typicalNeeds: [
      'Vente au litre, au bidon ou au carton',
      'Gestion des emballages consignés (bidons, fûts)',
      'Clients réguliers (hôtels, ménages, bureaux)',
      'Calcul des marges sur fabrication ou reconditionnement local',
    ],
    recommendedModules: ['stock_alerts', 'customer_credits', 'deliveries_tracking', 'cash_journal'],
    defaultTrackingMode: 'avec_stock',
    terminology: {
      salesNav: 'Ventes produits d’entretien',
      saleSingle: 'Vente détergent/hygiène',
      itemsLabel: 'Produits & Bidons',
      customerLabel: 'Client',
      quickActionSale: 'Nouvelle vente hygiène',
    },
    dashboardKpis: [
      { id: 'revenue', label: 'Chiffre d’affaires', desc: 'Ventes totales' },
      { id: 'grossProfit', label: 'Marge brute', desc: 'Bénéfice brut d’exploitation' },
      { id: 'receivables', label: 'Crédits clients', desc: 'Dettes entreprises' },
      { id: 'netCashFlow', label: 'Trésorerie disponible', desc: 'Solde de caisse' },
    ],
    defaultExpenseCategories: [
      { name: 'Matières premières & Détergents vrac', icon: '🧪' },
      { name: 'Bidons, Flacons & Étiquettes', icon: '🧴' },
      { name: 'Transport & Ravitaillement', icon: '🚚' },
      { name: 'Loyer point de vente', icon: '🏠' },
      { name: 'Eau & Électricité', icon: '💧' },
    ],
  },

  // ---------------------------------------------------------------------------
  // FAMILLE 2 : PRODUCTION ET TRANSFORMATION
  // ---------------------------------------------------------------------------
  restauration_repas: {
    id: 'restauration_repas',
    name: 'Restauration et vente de repas',
    family: 'production',
    familyName: 'Production et transformation',
    emoji: '🍲',
    iconName: 'Utensils',
    tagline: 'Achats du marché, préparation du jour, portions vendues, invendus et clôture journalière.',
    description: 'Restaurant, fast-food, cafétéria, vente de plats emportés et traiteur.',
    typicalNeeds: [
      'Achats du marché le matin et calcul du coût réel des ingrédients consommés',
      'Fiches recettes avec nombre de portions obtenues et coût par plat',
      'Suivi strict des portions préparées, vendues, offertes et perdues',
      'Distinction entre stock restant pour demain et consommation du jour',
    ],
    recommendedModules: ['food_preparation', 'cash_journal', 'deliveries_tracking', 'stock_alerts'],
    defaultTrackingMode: 'avec_stock',
    terminology: {
      salesNav: 'Service & Ventes de plats',
      saleSingle: 'Commande plat',
      itemsLabel: 'Plats du jour & Boissons',
      customerLabel: 'Client / Convive',
      quickActionSale: 'Encaisser un repas',
    },
    dashboardKpis: [
      { id: 'dailyRevenue', label: 'Chiffre du jour', desc: 'Recettes des repas servis aujourd’hui' },
      { id: 'portionsSold', label: 'Portions vendues', desc: 'Nombre de repas servis' },
      { id: 'ingredientsConsumedCost', label: 'Coût ingrédients consommés', desc: 'Valeur réelle des denrées cuisinées' },
      { id: 'portionsLost', label: 'Invendus & Pertes', desc: 'Plats non vendus en fin de service' },
      { id: 'dayProfit', label: 'Bénéfice estimé du jour', desc: 'Recettes moins ingrédients et charges' },
    ],
    defaultExpenseCategories: [
      { name: 'Marché frais (Viandes, Poissons, Légumes)', icon: '🥩' },
      { name: 'Huile, Condiments & Épices', icon: '🧂' },
      { name: 'Gaz, Charbon & Énergie de cuisson', icon: '🔥' },
      { name: 'Boissons & Brasserie', icon: '🥤' },
      { name: 'Emballages barquettes & couverts jetables', icon: '🥡' },
      { name: 'Salaires cuisiniers & serveurs', icon: '👥' },
      { name: 'Loyer salle & terrasse', icon: '🏠' },
    ],
  },

  boulangerie_patisserie: {
    id: 'boulangerie_patisserie',
    name: 'Boulangerie et pâtisserie',
    family: 'production',
    familyName: 'Production et transformation',
    emoji: '🥖',
    iconName: 'Coffee',
    tagline: 'Farine, fournées, gâteaux sur commande, pertes et rendements de cuisson.',
    description: 'Boulangerie artisanale, viennoiserie, pâtisserie pour événements et salon de thé.',
    typicalNeeds: [
      'Gestion des sacs de farine, levure, beurre et packaging',
      'Rendement par fournée (pains sortis du four vs farine consommée)',
      'Commandes spéciales de gâteaux d’anniversaire avec acompte',
      'Suivi des invendus de la veille et recyclage',
    ],
    recommendedModules: ['food_preparation', 'stock_alerts', 'service_orders', 'cash_journal'],
    defaultTrackingMode: 'avec_stock',
    terminology: {
      salesNav: 'Ventes pains & pâtisseries',
      saleSingle: 'Vente boulangerie',
      itemsLabel: 'Fournées & Gâteaux',
      customerLabel: 'Client',
      quickActionSale: 'Vente pain / gâteau',
    },
    dashboardKpis: [
      { id: 'revenue', label: 'Chiffre d’affaires', desc: 'Total des ventes du jour' },
      { id: 'flourConsumed', label: 'Farine & Ingrédients', desc: 'Coût des matières premières utilisées' },
      { id: 'grossProfit', label: 'Marge brute', desc: 'Chiffre moins matières premières' },
      { id: 'leftoversLoss', label: 'Invendus / Rassis', desc: 'Pains invendus déclassés' },
    ],
    defaultExpenseCategories: [
      { name: 'Farine de blé en sacs', icon: '🌾' },
      { name: 'Beurre, Sucre, Levure & Œufs', icon: '🥚' },
      { name: 'Énergie du four (Bois, Gaz, Électricité)', icon: '⚡' },
      { name: 'Boîtes pâtissières & Sachets pain', icon: '📦' },
      { name: 'Salaires boulangers & pâtissiers', icon: '👥' },
    ],
  },

  fruits_legumes: {
    id: 'fruits_legumes',
    name: 'Commerce de fruits et légumes',
    family: 'production',
    familyName: 'Production et transformation',
    emoji: '🍉',
    iconName: 'Apple',
    tagline: 'Arrivages du champ, cageots, tri de fraîcheur, pertes rapides et marges serrées.',
    description: 'Étal de primeur, distribution de fruits tropicaux, légumes frais et jus pressés.',
    typicalNeeds: [
      'Saisie des achats par cageots ou sacs',
      'Gestion des pertes dues à la dégradation rapide (périssables)',
      'Déclassement de prix pour écoulement rapide en fin de journée',
      'Livraisons régulières aux restaurateurs',
    ],
    recommendedModules: ['stock_alerts', 'food_preparation', 'cash_journal', 'deliveries_tracking'],
    defaultTrackingMode: 'avec_stock',
    terminology: {
      salesNav: 'Ventes primeur & fruits',
      saleSingle: 'Vente fruits/légumes',
      itemsLabel: 'Cageots & Régimes',
      customerLabel: 'Client',
      quickActionSale: 'Vente primeur',
    },
    dashboardKpis: [
      { id: 'revenue', label: 'Ventes du jour', desc: 'Total encaissé' },
      { id: 'freshStockCost', label: 'Coût des arrivages', desc: 'Achats au marché de gros' },
      { id: 'spoilageRate', label: 'Taux de pertes / Avaries', desc: 'Valeur des denrées abîmées' },
      { id: 'netMargin', label: 'Marge nette', desc: 'Bénéfice après pertes' },
    ],
    defaultExpenseCategories: [
      { name: 'Achat cageots & régimes au marché de gros', icon: '🥬' },
      { name: 'Transport camionnette / bâchée', icon: '🚚' },
      { name: 'Glace & Conservation fraîcheur', icon: '❄️' },
      { name: 'Manutention & Porteurs', icon: '💪' },
      { name: 'Loyer étal / hangar', icon: '🏠' },
    ],
  },

  produits_surgeles: {
    id: 'produits_surgeles',
    name: 'Commerce de produits surgelés et poissonnerie',
    family: 'production',
    familyName: 'Production et transformation',
    emoji: '🐟',
    iconName: 'Snowflake',
    tagline: 'Cartons de poisson, poulet, dinde, chaîne du froid et gestion par carton ou kilo.',
    description: 'Chambre froide, poissonnerie moderne, dépôt de découpes de volaille et surgelés.',
    typicalNeeds: [
      'Vente au carton scellé ou au détail par kilogramme',
      'Poids variable et décongélation / perte d’eau',
      'Suivi lourd de la facture d’électricité et groupe de secours',
      'Gestion des clients grossistes et revendeuses',
    ],
    recommendedModules: ['stock_alerts', 'customer_credits', 'cash_journal', 'treasury_scenarios'],
    defaultTrackingMode: 'avec_stock',
    terminology: {
      salesNav: 'Ventes surgelés & poissons',
      saleSingle: 'Vente carton/kilo',
      itemsLabel: 'Cartons de poisson & Viandes',
      customerLabel: 'Client / Revendeuse',
      quickActionSale: 'Vente carton surgelé',
    },
    dashboardKpis: [
      { id: 'revenue', label: 'Chiffre d’affaires', desc: 'Ventes totales surgelés' },
      { id: 'cogs', label: 'Coût d’achat cartons', desc: 'Prix d’achat aux armateurs' },
      { id: 'grossProfit', label: 'Marge brute', desc: 'Chiffre moins coût d’achat' },
      { id: 'receivables', label: 'Crédits revendeuses', desc: 'Encours à recouvrir' },
    ],
    defaultExpenseCategories: [
      { name: 'Achats cartons poissons & viandes', icon: '🐟' },
      { name: 'Électricité & Carburant groupe électrogène', icon: '⚡' },
      { name: 'Entretien compresseurs & gaz frigo', icon: '❄️' },
      { name: 'Transport frigo & manutention', icon: '🚛' },
      { name: 'Salaires magasiniers de chambre froide', icon: '👥' },
    ],
  },

  // ---------------------------------------------------------------------------
  // FAMILLE 3 : PRESTATIONS ET RENDEZ-VOUS
  // ---------------------------------------------------------------------------
  salon_coiffure_barbier: {
    id: 'salon_coiffure_barbier',
    name: 'Salon de coiffure et barbier',
    family: 'services_rdv',
    familyName: 'Prestations et soins',
    emoji: '💈',
    iconName: 'Scissors',
    tagline: 'Coupes, tresses, mèches, soins barbe, commissions coiffeurs et caisse de salon.',
    description: 'Salon de coiffure pour hommes ou femmes, barbier, vente de produits capillaires annexes.',
    typicalNeeds: [
      'Enregistrement rapide de la prestation et du coiffeur ayant réalisé le soin',
      'Calcul automatique des commissions des coiffeurs (ex: 30% ou 50%)',
      'Vente croisée de mèches, shampoings et crèmes coiffantes',
      'Caisse journalière avec pourboires distincts',
    ],
    recommendedModules: ['service_orders', 'stock_alerts', 'cash_journal', 'growth_cac'],
    defaultTrackingMode: 'simple',
    terminology: {
      salesNav: 'Prestations & Soins',
      saleSingle: 'Prestation coupe/tresse',
      itemsLabel: 'Soins & Coiffures',
      customerLabel: 'Client(e)',
      quickActionSale: 'Encaisser une prestation',
    },
    dashboardKpis: [
      { id: 'revenue', label: 'Recettes du jour', desc: 'Total prestations et ventes' },
      { id: 'servicesCount', label: 'Prestations réalisées', desc: 'Nombre de clients coiffés' },
      { id: 'commissionsTotal', label: 'Commissions à reverser', desc: 'Part due aux employés' },
      { id: 'netSalonProfit', label: 'Résultat net du salon', desc: 'Recettes moins commissions et charges' },
    ],
    defaultExpenseCategories: [
      { name: 'Commissions & Salaires coiffeurs', icon: '👥' },
      { name: 'Produits de salon (Shampoings, Mèches, Défrisants)', icon: '🧴' },
      { name: 'Électricité, Eau & Groupe', icon: '⚡' },
      { name: 'Lames, Alcool & Désinfectants', icon: '🪒' },
      { name: 'Loyer salon', icon: '🏠' },
    ],
  },

  institut_beaute: {
    id: 'institut_beaute',
    name: 'Institut de beauté et onglerie',
    family: 'services_rdv',
    familyName: 'Prestations et soins',
    emoji: '💅',
    iconName: 'HeartHandshake',
    tagline: 'Manucure, pédicure, soins du visage, massages et forfaits beauté.',
    description: 'Institut esthétique, bar à ongles, spa de jour et vente de cosmétiques professionnels.',
    typicalNeeds: [
      'Catalogue des soins à la carte et formules packages',
      'Consommables utilisés par soin (vernis, résines, cires, huiles)',
      'Suivi des clientes fidèles et historique de soins',
      'Acomptes sur réservations de mariages ou événements',
    ],
    recommendedModules: ['service_orders', 'stock_alerts', 'cash_journal', 'growth_cac'],
    defaultTrackingMode: 'simple',
    terminology: {
      salesNav: 'Soins esthétiques & Onglerie',
      saleSingle: 'Soin / Manucure',
      itemsLabel: 'Prestations & Soins',
      customerLabel: 'Cliente',
      quickActionSale: 'Encaisser un soin',
    },
    dashboardKpis: [
      { id: 'revenue', label: 'Chiffre d’affaires', desc: 'Recettes soins et vente produits' },
      { id: 'servicesDone', label: 'Soins effectués', desc: 'Volume de soins de la période' },
      { id: 'consumablesCost', label: 'Coût consommables', desc: 'Vernis, cires et crèmes consommés' },
      { id: 'netProfit', label: 'Bénéfice d’exploitation', desc: 'Marge après esthéticiennes et charges' },
    ],
    defaultExpenseCategories: [
      { name: 'Vernis, Gels, Résines & Capsules', icon: '💅' },
      { name: 'Cires à épiler, Huiles de massage & Crèmes', icon: '🧴' },
      { name: 'Linge, Coton, Alcool & Gants', icon: '🧼' },
      { name: 'Loyer institut & Climatisation', icon: '🏠' },
      { name: 'Salaires & Primes esthéticiennes', icon: '👥' },
    ],
  },

  // ---------------------------------------------------------------------------
  // FAMILLE 4 : COMMANDES ET TRAVAUX
  // ---------------------------------------------------------------------------
  atelier_couture: {
    id: 'atelier_couture',
    name: 'Atelier de couture et confection',
    family: 'commandes_travaux',
    familyName: 'Commandes, confection et travaux',
    emoji: '🪡',
    iconName: 'Scissors',
    tagline: 'Prise de mesures, fiches de modèles, acomptes, tissu client et date de livraison.',
    description: 'Atelier de stylisme, tailleur pour hommes, confection dames et tenues de cérémonie.',
    typicalNeeds: [
      'Fiche commande avec mesures précises (épaules, poitrine, taille, hanches, longueur)',
      'Distinction entre tissu fourni par le client et tissu vendu par l’atelier',
      'Enregistrement obligatoire de l’acompte (50% en général) et du solde à la livraison',
      'Date promise de livraison et alertes sur les commandes en retard',
    ],
    recommendedModules: ['service_orders', 'customer_credits', 'cash_journal', 'stock_alerts'],
    defaultTrackingMode: 'complet',
    terminology: {
      salesNav: 'Commandes & Confections',
      saleSingle: 'Commande modèle',
      itemsLabel: 'Modèles & Tissus',
      customerLabel: 'Client(e)',
      quickActionSale: 'Nouvelle commande couture',
    },
    dashboardKpis: [
      { id: 'ordersInProgress', label: 'Tenues en confection', desc: 'Commandes actives à l’atelier' },
      { id: 'advancesCollected', label: 'Acomptes encaissés', desc: 'Avances perçues sur commandes en cours' },
      { id: 'pendingBalances', label: 'Soldes à la livraison', desc: 'Argent à récupérer lors des essayages' },
      { id: 'completedOrdersRevenue', label: 'CA des tenues livrées', desc: 'Revenu finalisé de la période' },
    ],
    defaultExpenseCategories: [
      { name: 'Fils, Fermetures, Boutons & Doublures', icon: '🧵' },
      { name: 'Achat de pagnes & tissus atelier', icon: '👗' },
      { name: 'Entretien machines & Aiguilles', icon: '⚙️' },
      { name: 'Électricité & Fers à repasser vapeur', icon: '💡' },
      { name: 'Rémunération apprentis & tailleurs', icon: '👥' },
      { name: 'Loyer atelier', icon: '🏠' },
    ],
  },

  reparation_telephones_info: {
    id: 'reparation_telephones_info',
    name: 'Réparation téléphones et informatique',
    family: 'commandes_travaux',
    familyName: 'Commandes, confection et travaux',
    emoji: '🔧',
    iconName: 'Laptop',
    tagline: 'Fiches de dépôt, diagnostic technique, pièces détachées, devis et suivi de panne.',
    description: 'Technicien réparateur smartphone, micro-soudure, maintenance ordinateurs et déblocage.',
    typicalNeeds: [
      'Fiche de prise en charge avec état de l’appareil, panne déclarée et code de déverrouillage',
      'Devis estimé (Pièce détachée + Main-d’œuvre)',
      'Suivi des étapes : Diagnostiqué -> Pièce en attente -> Réparé -> Testé -> Livré',
      'Garantie sur la réparation effectuée',
    ],
    recommendedModules: ['service_orders', 'stock_alerts', 'customer_credits', 'cash_journal'],
    defaultTrackingMode: 'complet',
    terminology: {
      salesNav: 'Fiches de réparation',
      saleSingle: 'Fiche réparation',
      itemsLabel: 'Pièces & Réparations',
      customerLabel: 'Client propriétaire',
      quickActionSale: 'Nouvelle fiche de dépôt',
    },
    dashboardKpis: [
      { id: 'devicesInRepair', label: 'Appareils en atelier', desc: 'Smartphones et PC en cours de réparation' },
      { id: 'laborRevenue', label: 'Marge Main-d’œuvre', desc: 'Revenu pur du savoir-faire technique' },
      { id: 'sparePartsCost', label: 'Coût pièces consommées', desc: 'Écrans, batteries et nappes achetés' },
      { id: 'readyToDeliver', label: 'Appareils prêts', desc: 'En attente de retrait et règlement par le client' },
    ],
    defaultExpenseCategories: [
      { name: 'Achat écrans, batteries & connecteurs', icon: '📱' },
      { name: 'Outils & consommables (Flux, Étain, Alcool)', icon: '🔬' },
      { name: 'Licences de logiciels de déblocage / Flash', icon: '💻' },
      { name: 'Loyer kiosque / atelier', icon: '🏠' },
      { name: 'Électricité & Connexion haut débit', icon: '⚡' },
    ],
  },

  garage_mecanique: {
    id: 'garage_mecanique',
    name: 'Garage automobile, moto et pièces',
    family: 'commandes_travaux',
    familyName: 'Commandes, confection et travaux',
    emoji: '🚗',
    iconName: 'Wrench',
    tagline: 'Ordres de réparation, vidanges, pièces neuves/occasion, main-d’œuvre et factures.',
    description: 'Garage mécanique auto, atelier moto, électricité automobile, tôlerie et peinture.',
    typicalNeeds: [
      'Ordre de réparation mentionnant l’immatriculation, kilométrage et panne',
      'Séparation claire sur la facture entre pièces changées et frais de main-d’œuvre',
      'Gestion des acomptes nécessaires pour acheter les pièces chez les marchands',
      'Gestion des dettes des entreprises clientes avec flotte de véhicules',
    ],
    recommendedModules: ['service_orders', 'stock_alerts', 'customer_credits', 'cash_journal'],
    defaultTrackingMode: 'complet',
    terminology: {
      salesNav: 'Ordres de réparation & Factures',
      saleSingle: 'Ordre de réparation',
      itemsLabel: 'Pièces & Prestations',
      customerLabel: 'Client / Entreprise',
      quickActionSale: 'Nouvel ordre de réparation',
    },
    dashboardKpis: [
      { id: 'vehiclesInShop', label: 'Véhicules en cours', desc: 'Voitures et motos en réparation' },
      { id: 'laborRevenue', label: 'Main-d’œuvre facturée', desc: 'Revenu du travail mécanique' },
      { id: 'partsSold', label: 'Vente de pièces détachées', desc: 'Chiffre d’affaires sur les pièces' },
      { id: 'unpaidFleetBills', label: 'Factures impayées', desc: 'Créances clients entreprises' },
    ],
    defaultExpenseCategories: [
      { name: 'Achat pièces de rechange chez grossiste', icon: '⚙️' },
      { name: 'Huiles, Liquides de frein & Graisses', icon: '🛢️' },
      { name: 'Outillage lourd & consommables atelier', icon: '🔧' },
      { name: 'Salaire mécaniciens & tôliers', icon: '👥' },
      { name: 'Loyer terrain garage', icon: '🏭' },
    ],
  },

  // ---------------------------------------------------------------------------
  // FAMILLE 5 : GROS, DISTRIBUTION ET LOGISTIQUE
  // ---------------------------------------------------------------------------
  depot_boissons_distribution: {
    id: 'depot_boissons_distribution',
    name: 'Dépôt de boissons et distribution',
    family: 'distribution',
    familyName: 'Gros, distribution et logistique',
    emoji: '🍺',
    iconName: 'Truck',
    tagline: 'Casiers, palettes, consignes de bouteilles vides, tournées de livraison et crédits bars.',
    description: 'Dépôt grossiste de brasserie, distributeur d’eaux minérales, jus et boissons gazeuses.',
    typicalNeeds: [
      'Gestion des casiers pleins vs gestion du parc de bouteilles consignées (emballages vides)',
      'Livraison des bars, snacks et maquis avec règlements différés',
      'Suivi des camions de tournée et retours de marchandise',
      'Grosses rotations avec marges unitaires faibles par casier',
    ],
    recommendedModules: ['stock_alerts', 'customer_credits', 'deliveries_tracking', 'cash_journal', 'treasury_scenarios'],
    defaultTrackingMode: 'avec_stock',
    terminology: {
      salesNav: 'Bons de livraison & Ventes',
      saleSingle: 'Livraison casiers',
      itemsLabel: 'Casiers & Bouteilles',
      customerLabel: 'Bar / Snack / Détaillant',
      quickActionSale: 'Nouveau bon de livraison',
    },
    dashboardKpis: [
      { id: 'cratesVolume', label: 'Casiers vendus', desc: 'Volume de casiers sortis' },
      { id: 'revenue', label: 'Chiffre d’affaires', desc: 'Recettes brasserie' },
      { id: 'barDebts', label: 'Crédits snacks / bars', desc: 'Encours total des débits de boisson' },
      { id: 'emptyCratesBalance', label: 'Consignes en circulation', desc: 'Emballages vides dehors' },
    ],
    defaultExpenseCategories: [
      { name: 'Approvisionnement brasserie & usine', icon: '🏭' },
      { name: 'Carburant camions de livraison', icon: '⛽' },
      { name: 'Manutentionnaires & Chauffeurs-livreurs', icon: '👥' },
      { name: 'Rachat consignes & bouteilles cassées', icon: '🍾' },
      { name: 'Loyer entrepôt dépôt', icon: '🏢' },
    ],
  },

  // ---------------------------------------------------------------------------
  // FAMILLE 6 : TRANSACTIONS ET SERVICES PROFESSIONNELS
  // ---------------------------------------------------------------------------
  agence_mobile_money: {
    id: 'agence_mobile_money',
    name: 'Agence Mobile Money et transfert',
    family: 'transactions',
    familyName: 'Transactions & Services professionnels',
    emoji: '📲',
    iconName: 'Smartphone',
    tagline: 'Dépôts, retraits, flotte Orange/MTN/Wave, commissions nettes et étanchéité des fonds clients.',
    description: 'Kiosque multi-opérateurs, agence de paiement, points de services Mobile Money et transferts.',
    typicalNeeds: [
      'Étanchéité absolue : l’argent qui transite pour le client N’EST PAS du chiffre d’affaires',
      'Le seul revenu réel est la commission acquise sur chaque dépôt / retrait',
      'Rapprochement strict entre solde liquide (tiroir-caisse) et solde UV / Flotte électronique',
      'Journal des opérations sans confusion de caisse',
    ],
    recommendedModules: ['mobile_money_ops', 'cash_journal', 'customer_credits'],
    defaultTrackingMode: 'simple',
    terminology: {
      salesNav: 'Opérations Mobile Money',
      saleSingle: 'Opération Dépôt/Retrait',
      itemsLabel: 'Commissions & Services',
      customerLabel: 'Client transfert',
      quickActionSale: 'Nouvelle transaction MoMo',
    },
    dashboardKpis: [
      { id: 'commissionRevenue', label: 'Commissions nettes acquises', desc: 'VRAI chiffre d’affaires de l’agence' },
      { id: 'dailyTransits', label: 'Volumes traités (Flux)', desc: 'Total des fonds clients manipulés' },
      { id: 'physicalCash', label: 'Solde espèces disponible', desc: 'Liquidités physiques dans le tiroir' },
      { id: 'floatBalance', label: 'Soldes virtuels (Flotte UV)', desc: 'Fonds disponibles sur les SIM opérateurs' },
    ],
    defaultExpenseCategories: [
      { name: 'Frais de transfert inter-opérateurs / Liquidation', icon: '🔄' },
      { name: 'Forfaits internet & SIM data terminaux', icon: '📶' },
      { name: 'Rouleaux de reçus & Papier thermique', icon: '🧾' },
      { name: 'Loyer kiosque & Sécurité', icon: '🏠' },
      { name: 'Écarts de caisse / Erreurs de numéro', icon: '⚠️' },
    ],
  },

  services_agence_digitale: {
    id: 'services_agence_digitale',
    name: 'Prestations de services et agence digitale',
    family: 'transactions',
    familyName: 'Transactions & Services professionnels',
    emoji: '💼',
    iconName: 'Briefcase',
    tagline: 'Devis, honoraires, missions, sous-traitance, facturation et rentabilité par projet.',
    description: 'Agence web, communication digitale, cabinet de conseil, freelance tech et prestations intellectuelles.',
    typicalNeeds: [
      'Gestion du cycle Devis -> Acompte -> Mission -> Facture -> Solde',
      'Suivi des dépenses et sous-traitants imputables à chaque mission',
      'Délai de paiement clients et relances professionnelles',
      'Calcul de la marge nette par prestation',
    ],
    recommendedModules: ['service_orders', 'customer_credits', 'growth_cac', 'treasury_scenarios', 'ai_copilot'],
    defaultTrackingMode: 'complet',
    terminology: {
      salesNav: 'Devis, Missions & Factures',
      saleSingle: 'Contrat / Mission',
      itemsLabel: 'Prestations & Livrables',
      customerLabel: 'Client / Donneur d’ordre',
      quickActionSale: 'Nouveau devis / Facture',
    },
    dashboardKpis: [
      { id: 'signedRevenue', label: 'Chiffre d’affaires facturé', desc: 'Total honoraires validés' },
      { id: 'cashCollected', label: 'Encaissements réels', desc: 'Acomptes et soldes payés' },
      { id: 'pendingInvoices', label: 'Factures en attente', desc: 'Créances clients à échoir' },
      { id: 'projectMargin', label: 'Marge moyenne par projet', desc: 'Honoraires moins sous-traitance et frais' },
    ],
    defaultExpenseCategories: [
      { name: 'Sous-traitance freelances & experts', icon: '👥' },
      { name: 'Abonnements logiciels SaaS & Cloud', icon: '☁️' },
      { name: 'Publicité en ligne (Google, Meta)', icon: '🎯' },
      { name: 'Connexion Internet fibre & Télécoms', icon: '🌐' },
      { name: 'Déplacements & Frais de rendez-vous clients', icon: '🚕' },
      { name: 'Loyer bureau / Co-working', icon: '🏢' },
    ],
  },
};

export function getBusinessProfile(profileId?: string | null): BusinessProfileConfig {
  if (!profileId) return BUSINESS_PROFILES.epicerie_alimentation;
  return BUSINESS_PROFILES[profileId as BusinessProfileId] || BUSINESS_PROFILES.epicerie_alimentation;
}

export function getProfilesGroupedByFamily() {
  const families = Object.keys(BUSINESS_FAMILIES) as BusinessProfileFamily[];
  return families.map(familyKey => {
    const familyInfo = BUSINESS_FAMILIES[familyKey];
    const profiles = Object.values(BUSINESS_PROFILES).filter(p => p.family === familyKey);
    return {
      familyKey,
      ...familyInfo,
      profiles,
    };
  });
}
