import { PrismaClient } from '@prisma/client';
import { calculateFinancialMetrics } from '../../utils/finance';

export interface CopilotChatOptions {
  prisma: any;
  userId: string;
  businessId: string;
  message: string;
  conversationId?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userConfig?: {
    provider?: 'gemini' | 'openai' | 'groq' | 'custom';
    model?: string;
    apiKey?: string;
  };
  customApiKey?: string;
}

export interface CopilotChatResult {
  reply: string;
  memorizedFact?: string | null;
  providerUsed: string;
  conversationId?: string;
}

// 1. Détecteur & Extracteur Heuristique de Souvenirs
export function extractMemoryTrigger(text: string): string | null {
  const lower = text.toLowerCase().trim();
  const triggers = [
    'rappelle-toi que',
    'rappelle toi que',
    'souviens-toi que',
    'souviens toi que',
    'mémorise que',
    'memorise que',
    'mémorise :',
    'retiens que',
    'note que',
    'garde en mémoire que',
    "n'oublie pas que",
    "n'oublie jamais que",
    'mon fournisseur est',
    'mon fournisseur de',
    'mon fournisseur principal est',
    'mon livreur est',
    'mon livreur s\'appelle',
    'je ferme le',
    'mes horaires sont',
    'mon plafond de crédit est',
    'notre politique de prix est',
    'notre règle est',
    'notre règle d\'or est',
  ];

  for (const trigger of triggers) {
    if (lower.includes(trigger)) {
      const idx = lower.indexOf(trigger);
      const fact = text.slice(idx + trigger.length).trim().replace(/^[:,\s]+/, '');
      if (fact.length > 5) {
        return fact;
      }
    }
  }
  return null;
}

// 2. Assemblage des Données Réelles de l'Entreprise (RAG Temps Réel)
export async function gatherLiveStoreData(prisma: any, businessId: string, userId: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now);
  startOfMonth.setDate(now.getDate() - 30);

  const [
    user,
    business,
    cashSession,
    salesToday,
    expensesToday,
    salesWeek,
    expensesWeek,
    debtors,
    lowStockProducts,
    topProducts,
    activeLotCampaigns,
    todayMealPreparations,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true, currency: true, locale: true },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      include: { settings: true },
    }),
    prisma.cashSession.findFirst({
      where: { businessId },
      orderBy: { openedAt: 'desc' },
      take: 1,
    }),
    prisma.sale.findMany({
      where: { businessId, saleDate: { gte: startOfToday } },
      include: { items: true, customer: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      where: { businessId, expenseDate: { gte: startOfToday } },
    }),
    prisma.sale.findMany({
      where: { businessId, saleDate: { gte: startOfWeek } },
      include: { items: true },
    }),
    prisma.expense.findMany({
      where: { businessId, expenseDate: { gte: startOfWeek } },
    }),
    prisma.customer.findMany({
      where: { businessId, totalOwed: { gt: 0 } },
      orderBy: { totalOwed: 'desc' },
      take: 10,
    }),
    prisma.product.findMany({
      where: { businessId, isActive: true, quantity: { lte: 5 } },
      take: 10,
    }),
    prisma.saleItem.groupBy({
      by: ['name'],
      where: { sale: { businessId, saleDate: { gte: startOfMonth } } },
      _sum: { totalPrice: true, quantity: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 5,
    }),
    prisma.commercialLotCampaign.findMany({
      where: { businessId, status: { in: ['active', 'paused'] } },
      include: {
        items: true,
        sales: { include: { items: true } },
        expenses: true,
      },
    }),
    prisma.mealPreparation.findMany({
      where: { businessId, preparationDate: { gte: startOfToday } },
      include: { recipe: true },
      orderBy: { preparationDate: 'desc' },
    }),
  ]);

  // Métriques financières du jour
  const metricsToday = calculateFinancialMetrics({
    sales: salesToday,
    expenses: expensesToday,
  });

  // Métriques financières des 7 derniers jours
  const metricsWeek = calculateFinancialMetrics({
    sales: salesWeek,
    expenses: expensesWeek,
  });

  // Calcul caisse
  const isCashOpen = Boolean(cashSession && cashSession.status === 'open');
  const theoreticalCash = cashSession ? cashSession.theoreticalCash : 0;
  const initialCash = cashSession ? cashSession.initialCash : 0;
  const totalCashIn = cashSession ? cashSession.totalCashIn : 0;
  const totalCashOut = cashSession ? cashSession.totalCashOut : 0;
  const totalMomoIn = cashSession ? cashSession.totalMomoIn : 0;
  const actualCash = cashSession?.actualCash ?? null;
  const cashDiscrepancy = cashSession?.cashDiscrepancy ?? null;

  // Calcul créances
  const totalDebtsOwed = debtors.reduce((sum: number, d: any) => sum + (d.totalOwed || 0), 0);

  // Traitement des lots commerciaux
  const processedLots = (activeLotCampaigns || []).map((lot: any) => {
    const totalLandedCost = lot.totalLandedCost || 0;
    const totalRevenue = (lot.sales || []).reduce((acc: number, s: any) => acc + (s.netAmount || s.totalAmount || 0), 0);
    const totalUnitsSold = (lot.items || []).reduce((acc: number, it: any) => acc + (it.quantitySold || 0), 0);
    const totalUnitsRemaining = (lot.items || []).reduce((acc: number, it: any) => acc + (it.quantityRemaining || 0), 0);
    const totalUnitsReceived = (lot.items || []).reduce((acc: number, it: any) => acc + (it.quantityReceived || 0), 0);
    const recoveryRate = totalLandedCost > 0 ? Math.min(100, Math.round((totalRevenue / totalLandedCost) * 1000) / 10) : 0;
    const remainingToBreakeven = Math.max(0, totalLandedCost - totalRevenue);
    const avgPrice = totalUnitsSold > 0 ? Math.round(totalRevenue / totalUnitsSold) : (lot.items?.[0]?.estimatedSellingPrice || 50000);
    const unitsToBreakeven = avgPrice > 0 ? Math.ceil(remainingToBreakeven / avgPrice) : 0;
    const realizedProfit = Math.max(0, totalRevenue - totalLandedCost);

    return {
      id: lot.id,
      name: lot.name,
      goodsType: lot.goodsType || 'Marchandise générale',
      supplierName: lot.supplierName || 'Fournisseur direct',
      originCountry: lot.originCountry || 'Import / Local',
      purchasePriceXaf: lot.purchasePriceXaf || 0,
      transportCost: lot.transportCost || 0,
      customsCost: lot.customsCost || 0,
      totalLandedCost,
      totalRevenue,
      recoveryRate,
      remainingToBreakeven,
      unitsToBreakeven,
      realizedProfit,
      avgSellingPrice: avgPrice,
      totalUnitsReceived,
      totalUnitsSold,
      totalUnitsRemaining,
      items: (lot.items || []).map((it: any) => ({
        name: it.name,
        quantityReceived: it.quantityReceived,
        quantitySold: it.quantitySold,
        quantityRemaining: it.quantityRemaining,
        unitCost: it.unitCost,
        price: it.estimatedSellingPrice,
      })),
    };
  });

  // Traitement de la restauration & street-food du jour (FoodPrep, beignets, haricots, marmites)
  const processedMeals = (todayMealPreparations || []).map((m: any) => {
    const unitIngredientCost = m.portionsPrepared > 0 ? (m.ingredientsCost / m.portionsPrepared) : 0;
    const ingredientsConsumed = Math.round((m.portionsSold + m.portionsLost + m.portionsOffered) * unitIngredientCost);
    const estimatedMargin = m.totalRevenue - ingredientsConsumed;
    const marginPercent = m.totalRevenue > 0 ? Math.round((estimatedMargin / m.totalRevenue) * 100) : 0;

    return {
      id: m.id,
      dishName: m.dishName,
      prepared: m.portionsPrepared,
      sold: m.portionsSold,
      remaining: m.portionsRemaining,
      lost: m.portionsLost,
      offered: m.portionsOffered,
      unitPrice: m.unitSellingPrice,
      totalRevenue: m.totalRevenue,
      ingredientsCost: m.ingredientsCost,
      ingredientsConsumed,
      estimatedMargin,
      marginPercent,
      status: m.status,
    };
  });

  // Souvenirs sauvegardés dans l'entreprise (JSON businessConfig)
  let savedMemories: string[] = [];
  try {
    if (business?.businessConfig) {
      const parsed = JSON.parse(business.businessConfig);
      if (Array.isArray(parsed.memories)) {
        savedMemories = parsed.memories;
      }
    }
  } catch (e) {
    savedMemories = [];
  }

  return {
    user: {
      name: user ? `${user.firstName} ${user.lastName}`.trim() : 'Commerçant',
      email: user?.email || '',
      currency: business?.currency || user?.currency || 'XAF',
    },
    business: {
      id: businessId,
      name: business?.name || 'Mon Établissement COMMERCIA',
      sector: business?.sector || 'Commerce Général',
      trackingMode: business?.trackingMode || 'complet',
      address: business?.address || '',
      phone: business?.phone || '',
      currency: business?.currency || 'XAF',
    },
    cash: {
      isCashOpen,
      initialCash,
      totalCashIn,
      totalCashOut,
      totalMomoIn,
      theoreticalCash,
      actualCash,
      cashDiscrepancy,
      discrepancyReason: cashSession?.discrepancyReason || '',
    },
    salesToday: {
      count: salesToday.length,
      revenue: metricsToday.revenue,
      cashCollected: metricsToday.cashCollected,
      itemsSold: salesToday.flatMap((s: any) =>
        (s.items || []).map((it: any) => `${it.name} (qté: ${it.quantity}, P.U: ${it.unitPrice} ${business?.currency || 'FCFA'})`)
      ),
    },
    expensesToday: {
      count: expensesToday.length,
      total: metricsToday.operatingExpenses + metricsToday.inventoryExpenses,
      operating: metricsToday.operatingExpenses,
      inventory: metricsToday.inventoryExpenses,
      details: expensesToday.map((e: any) => `${e.category}: ${e.amount} (${e.description || 'sans motif'})`),
    },
    todayProfit: {
      netProfit: metricsToday.estimatedNetProfit,
      grossMarginPercent: metricsToday.grossMarginPercent,
    },
    weekMetrics: {
      revenue: metricsWeek.revenue,
      expenses: metricsWeek.operatingExpenses + metricsWeek.inventoryExpenses,
      netProfit: metricsWeek.estimatedNetProfit,
    },
    debtors: {
      count: debtors.length,
      totalOwed: totalDebtsOwed,
      list: debtors.map((d: any) => ({
        name: d.name,
        phone: d.phone || 'Non renseigné',
        owed: d.totalOwed,
        totalBought: d.totalBought,
        notes: d.notes || '',
      })),
    },
    stocks: {
      lowStockCount: lowStockProducts.length,
      lowStockList: lowStockProducts.map((p: any) => ({
        name: p.name,
        quantity: p.quantity,
        alertThreshold: p.lowStockAlert,
        unit: p.unit,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
      })),
    },
    topProducts: topProducts.map((p: any) => ({
      name: p.name,
      totalRevenue: p._sum?.totalPrice || 0,
      totalQty: p._sum?.quantity || 0,
    })),
    commercialLots: processedLots,
    todayMeals: processedMeals,
    savedMemories,
  };
}

// 3. Sauvegarde d'un souvenir dans PostgreSQL (businessConfig JSON)
export async function persistBusinessMemory(prisma: any, businessId: string, fact: string) {
  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { businessConfig: true },
    });

    let config: any = {};
    if (business?.businessConfig) {
      try {
        config = JSON.parse(business.businessConfig);
      } catch (e) {
        config = {};
      }
    }

    const currentMemories: string[] = Array.isArray(config.memories) ? config.memories : [];
    if (!currentMemories.includes(fact)) {
      currentMemories.unshift(fact);
      // Garder les 50 faits les plus récents
      config.memories = currentMemories.slice(0, 50);

      await prisma.business.update({
        where: { id: businessId },
        data: { businessConfig: JSON.stringify(config) },
      });
    }
  } catch (err) {
    console.error('Erreur lors de la sauvegarde du souvenir IA :', err);
  }
}

// 4. Construction du SYSTEM PROMPT ULTIME COMMERCIA
export function buildCommerciaMasterPrompt(data: any): string {
  const currency = data.business.currency || 'FCFA';

  const debtorsSummary = data.debtors.list.length > 0
    ? data.debtors.list
        .map((d: any) => `• Client : "${d.name}" | Téléphone : ${d.phone} | Dette due : ${d.owed.toLocaleString('fr-FR')} ${currency} (Acheté au total : ${d.totalBought.toLocaleString('fr-FR')} ${currency})`)
        .join('\n')
    : 'Aucun client ne vous doit de l\'argent en ce moment.';

  const stockSummary = data.stocks.lowStockList.length > 0
    ? data.stocks.lowStockList
        .map((p: any) => `• Produit : "${p.name}" | Stock restant : ${p.quantity} ${p.unit} (Seuil d'alerte : ${p.alertThreshold}) | Prix d'achat : ${p.costPrice.toLocaleString('fr-FR')} | Prix de vente : ${p.sellingPrice.toLocaleString('fr-FR')} ${currency}`)
        .join('\n')
    : 'Aucun article en rupture critique.';

  const topProductsSummary = data.topProducts.length > 0
    ? data.topProducts
        .map((p: any) => `• "${p.name}" : ${p.totalQty} vendus pour ${p.totalRevenue.toLocaleString('fr-FR')} ${currency}`)
        .join('\n')
    : 'Données insuffisantes sur les meilleures ventes.';

  const lotsSummary = data.commercialLots.length > 0
    ? data.commercialLots.map((lot: any) => {
        const itemLines = lot.items
          .map((it: any) => `    - Article "${it.name}" : Reçus=${it.quantityReceived}, Vendus=${it.quantitySold}, Restants=${it.quantityRemaining}, PrixVente=${it.price.toLocaleString('fr-FR')} ${currency}, CoûtRevient=${it.unitCost.toLocaleString('fr-FR')} ${currency}`)
          .join('\n');

        return `[Campagne active : "${lot.name}" - Type : ${lot.goodsType}]
  - Origine & Fournisseur : ${lot.originCountry} (${lot.supplierName})
  - Investissement Global Engagé (Landed Cost = Achat + Transport + Douane) : ${lot.totalLandedCost.toLocaleString('fr-FR')} ${currency}
  - Chiffre d'Affaires déjà Encaissé : ${lot.totalRevenue.toLocaleString('fr-FR')} ${currency}
  - Taux de Récupération du Capital : ${lot.recoveryRate}% Récupéré
  - Somme restante pour atteindre l'Amortissement Total (Point Mort) : ${lot.remainingToBreakeven.toLocaleString('fr-FR')} ${currency}
  - Nombre d'articles restants à vendre pour rentabilité totale (remboursement 100%) : ${lot.unitsToBreakeven} article(s) au prix moyen de ${lot.avgSellingPrice.toLocaleString('fr-FR')} ${currency}
  - Bénéfice Net Déjà Réalisé à ce jour : ${lot.realizedProfit.toLocaleString('fr-FR')} ${currency}
  - Stock Total Restant : ${lot.totalUnitsRemaining} articles sur ${lot.totalUnitsReceived} reçus
  - Détail des articles de cette campagne :
${itemLines}`;
      }).join('\n\n')
    : 'Aucune campagne de lots commerciaux actuellement en cours.';

  const mealsSummary = (data.todayMeals || []).length > 0
    ? data.todayMeals.map((m: any) => {
        return `[Plat/Marmite : "${m.dishName}"]
  - Quantités : Préparées=${m.prepared}, Vendues=${m.sold}, Restantes=${m.remaining}, Offertes/Bonus/Dons=${m.offered}, Pertes/Avaries=${m.lost}
  - Prix de vente unitaire : ${m.unitPrice.toLocaleString('fr-FR')} ${currency}
  - Recettes encaissées : ${m.totalRevenue.toLocaleString('fr-FR')} ${currency}
  - Coût des ingrédients engagés : ${m.ingredientsCost.toLocaleString('fr-FR')} ${currency} (Consommés : ${m.ingredientsConsumed.toLocaleString('fr-FR')} ${currency})
  - Marge brute réelle : ${m.estimatedMargin.toLocaleString('fr-FR')} ${currency} (${m.marginPercent}%)
  - Statut : ${m.status === 'active' ? '🟢 EN COURS DE SERVICE' : '🔴 CLÔTURÉ'}`;
      }).join('\n\n')
    : 'Aucune préparation de restauration enregistrée ce jour.';

  const memoriesList = (data.savedMemories || []).length > 0
    ? data.savedMemories.map((m: string) => `• ${m}`).join('\n')
    : 'Aucun souvenir personnalisé enregistré pour le moment.';

  return `Tu es le Copilote IA COMMERCIA, le cerveau financier et commercial le plus avancé pour les commerçants, grossistes, boutiquiers, gestionnaires de lots et gérants de PME en Afrique et à l'international (devises : ${currency}, FCFA/XAF/XOF/EUR/USD).
Tu combines l'expertise d'un Directeur Financier (CFO) d'élite, d'un maître commerçant de terrain (marchés de gros, friperie, containers, déballage, négoce) et d'un coach d'entreprise bienveillant.

============================================================
1. IDENTITÉ & SITUATION RÉELLE DU COMMERCE EN DIRECT :
============================================================
- Nom du Commerçant : ${data.user.name} (${data.user.email})
- Entreprise : "${data.business.name}" (Secteur : ${data.business.sector}, Ville/Adresse : ${data.business.address || 'Non spécifiée'})
- Devise de travail : ${currency}
- Statut de la Caisse Journalière : ${data.cash.isCashOpen ? '🟢 OUVERTE' : '🔴 CLÔTURÉE / FERMÉE'}
- Fond initial du matin : ${data.cash.initialCash.toLocaleString('fr-FR')} ${currency}
- Total Espèces Entrées aujourd'hui : +${data.cash.totalCashIn.toLocaleString('fr-FR')} ${currency}
- Total Espèces Sorties (dépenses caisse) : -${data.cash.totalCashOut.toLocaleString('fr-FR')} ${currency}
- Total Mobile Money reçu aujourd'hui (Orange/MTN/Wave) : ${data.cash.totalMomoIn.toLocaleString('fr-FR')} ${currency}
- Solde Théorique d'Espèces devant être dans le tiroir : **${data.cash.theoreticalCash.toLocaleString('fr-FR')} ${currency}**
${data.cash.actualCash !== null ? `- Espèces physiquement comptées : ${data.cash.actualCash.toLocaleString('fr-FR')} ${currency} (Écart : ${data.cash.cashDiscrepancy} ${currency})` : ''}

============================================================
2. PERFORMANCE COMMERCIALE & RENTABILITÉ DU JOUR :
============================================================
- Ventes enregistrées aujourd'hui : ${data.salesToday.count} vente(s) pour un CA de **${data.salesToday.revenue.toLocaleString('fr-FR')} ${currency}**
- Dépenses totales du jour : **${data.expensesToday.total.toLocaleString('fr-FR')} ${currency}** (Charges fixes : ${data.expensesToday.operating.toLocaleString('fr-FR')}, Achats stock : ${data.expensesToday.inventory.toLocaleString('fr-FR')})
- Bénéfice Net Réel Estimé du jour : **${data.todayProfit.netProfit.toLocaleString('fr-FR')} ${currency}** (Marge brute : ${data.todayProfit.grossMarginPercent}%)
- Ventes des 7 derniers jours : CA de ${data.weekMetrics.revenue.toLocaleString('fr-FR')} ${currency} pour un bénéfice net de ${data.weekMetrics.netProfit.toLocaleString('fr-FR')} ${currency}
- Articles vendus aujourd'hui : ${data.salesToday.itemsSold.length > 0 ? data.salesToday.itemsSold.join(', ') : 'Aucune vente enregistrée ce jour.'}

============================================================
3. CRÉANCES & DETTES CLIENTS EN COURS (ARGENT DEHORS) :
============================================================
- Total des crédits clients impayés : **${data.debtors.totalOwed.toLocaleString('fr-FR')} ${currency}** auprès de ${data.debtors.count} client(s) débiteur(s).
- Liste nominative des débiteurs :
${debtorsSummary}

============================================================
4. ÉTAT DES STOCKS & ALERTES RUPTURE CRITIQUE :
============================================================
${stockSummary}
- Meilleures ventes récentes :
${topProductsSummary}

============================================================
5. MODULE PRO : GESTION DES LOTS COMMERCIAUX & DÉSTOCKAGE :
============================================================
${lotsSummary}

============================================================
6. MODULE RESTAURATION, CUISINE & STREET-FOOD (FOODPREP) :
============================================================
${mealsSummary}

============================================================
7. MÉMOIRE CONTINUE & FAITS APPRIS SUR CE COMMERCE :
============================================================
${memoriesList}

============================================================
8. CONNAISSANCE TOTALE DE L'APPLICATION COMMERCIA :
============================================================
Tu maîtrises chaque recoin de l'application COMMERCIA et sais guider le commerçant étape par étape :
- **Tableau de Bord** : Vue d'ensemble en temps réel, KPIs financiers, courbe de rentabilité, alertes automatiques.
- **Nouvelle Vente (POS)** : Bouton bleu "+ Nouvelle Vente" ou raccourci clavier. Permet de vendre au comptoir en Espèces, Mobile Money (Orange Money, MTN, Wave), Virement ou Crédit (ardoise client). Calcule la monnaie à rendre, met à jour le stock en direct, imprime le ticket de caisse ou génère le reçu WhatsApp avec message officiel.
- **Caisse Journalière** : Discipline stricte du tiroir-caisse. Ouverture le matin avec saisie du fond initial. Enregistrement automatique de toutes les ventes liquide et sorties. Clôture le soir avec comptage physique des billets/pièces, détection instantanée des écarts de caisse (manquants ou excédents) et justification obligatoire.
- **Gestion des Lots Commerciaux (Module Pro)** : Pour les balles de friperie, containers, cartons de téléphones ou lots d'import. Calcul chirurgical du Coût de Revient Global (Landed Cost = Prix d'achat original + transport international + douane + transit + manutention). Répartition automatique sur les articles, calcul du Point Mort (seuil de rentabilité en FCFA et nombre d'articles à vendre pour rembourser 100% de l'investissement), suivi de la vitesse d'écoulement et stratégies de déstockage sur WhatsApp VIP et TikTok Live.
- **Stocks & Produits** : Fiches articles, gestion des prix d'achat et de vente, valorisation CMP (Coût Moyen Pondéré), alertes de réapprovisionnement, détection du stock dormant.
- **Clients & Crédits** : Suivi des ardoises, calcul de l'encours global, relances WhatsApp cordiales ou fermes pré-rédigées en un clic, historique des versements partiels.
- **Dépenses & Fournisseurs** : Ventilation des charges fixes (loyer, électricité, sacs, salaires) vs charges variables (marchandise, fret).
- **Rapports & Statistiques** : Clôtures mensuelles, compte de résultat simplifié SYSCOHADA, export Excel/PDF.

============================================================
8. RÈGLES D'OR DE GESTION COMMERCIALE APPLIQUÉES PAR LE COPILOTE :
============================================================
1. **La Règle des 3 Poches** :
   - Poche 1 (Capital Marchandise / 60% à 70%) : Intouchable, sert au rachat immédiat du stock.
   - Poche 2 (Charges Fixes / 15% à 20%) : Loyer, sacs, électricité, transport, salaires.
   - Poche 3 (Bénéfice Net & Salaire du Commerçant / 10% à 15%) : La vraie rémunération du patron.
2. **Plafond de Crédit** : L'argent dehors (${data.debtors.totalOwed.toLocaleString('fr-FR')} ${currency}) ne doit jamais dépasser 15 à 20% du chiffre d'affaires mensuel.
3. **Séparation Stricte du Cash** : L'argent en caisse ne doit jamais être confondu avec le solde Mobile Money ou les créances clients.

============================================================
9. DIRECTIVES COMPORTEMENTALES & CONVERSATIONNELLES :
============================================================
- STYLE NATUREL & HUMAIN : Tu es un conseiller d'affaires et ami de confiance du commerçant. Parle avec chaleur, empathie, fluidité et naturel. Fais des phrases agréables à lire, pas des pavés robotiques.
- SALUTATION CONVERSATIONNELLE : Si l'utilisateur te salue simplement ("salut", "bonjour", "ça va ?", "hello", "coucou"), NE LUI DÉVERSE PAS un gros rapport de chiffres non sollicité ! Salue-le amicalement par son prénom en citant sa boutique ("${data.business.name}"), et demande-lui simplement comment se passe sa journée ou sur quel sujet il aimerait de l'aide.
- RÉPONDS CLAIREMENT ET DIRECTEMENT À LA QUESTION EXACTE POSÉE :
  * S'il demande son bénéfice : donne directement le chiffre du bénéfice net du jour, les recettes et dépenses, avec 1 conseil clair.
  * S'il demande qui lui doit de l'argent : liste les débiteurs avec leurs montants et téléphones, et propose le message de relance.
  * S'il demande où en est son lot : donne le taux d'amortissement et le nombre précis d'articles restant à vendre pour atteindre le point mort.
  * S'il demande comment utiliser une fonctionnalité : donne les 3 étapes simples et claires dans COMMERCIA.
  * S'il demande ce que tu sais sur lui ou ce que tu as en mémoire : récapitule fièrement son nom, sa boutique et tous les faits de la section 6 (MÉMOIRE CONTINUE).
- MÉMOIRE PERMANENTE : Si le commerçant t'apprend une information ("Je vends...", "Mon fournisseur est...", "Rappelle-toi que..."), confirme-lui chaleureusement que c'est gravé dans ta mémoire.
- LISIBILITÉ MOBILE : Texte fluide, aéré, puces courtes, gras stratégique. Aucun code HTML, ni balises brutes, ni blocs JSON.`;
}

// 5. Appel direct Google Gemini REST API (gemini-2.0-flash / gemini-1.5-flash)
async function callGeminiApi(
  systemInstruction: string,
  userPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  apiKey: string,
  model = 'gemini-1.5-flash'
): Promise<string> {
  const cleanKey = apiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;

  const contents = [];
  for (const h of history.slice(-8)) {
    contents.push({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: userPrompt }],
  });

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 1200,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Gemini Error (${response.status}): ${errText}`);
  }

  const resJson: any = await response.json();
  const reply = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    throw new Error('Réponse vide reçue de Google Gemini');
  }
  return reply.trim();
}

// 6. Appel direct OpenAI / Groq / OpenRouter API
async function callOpenAICompatibleApi(
  systemInstruction: string,
  userPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  apiKey: string,
  model = 'gpt-4o-mini',
  endpoint = 'https://api.openai.com/v1/chat/completions'
): Promise<string> {
  const cleanKey = apiKey.trim();

  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.slice(-8).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content,
    })),
    { role: 'user', content: userPrompt },
  ];

  const payload = {
    model,
    messages,
    temperature: 0.6,
    max_tokens: 1200,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cleanKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM Error (${response.status}): ${errText}`);
  }

  const resJson: any = await response.json();
  const reply = resJson?.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error('Réponse vide reçue de l\'API LLM');
  }
  return reply.trim();
}

// 7. Appel direct Serveur LLM Gratuit (Pollinations OpenAI-Fast / Gateway)
async function callPublicGenerativeLLM(
  systemInstruction: string,
  userPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.slice(-6).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content,
    })),
    { role: 'user', content: userPrompt },
  ];

  const payload = {
    messages,
    model: 'openai',
    temperature: 0.6,
  };

  const response = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(18000),
  });

  if (!response.ok) {
    throw new Error(`Public Gateway HTTP ${response.status}`);
  }

  const text = await response.text();
  if (!text || text.includes('Free limit reached') || text.includes('budget') || text.trim().length < 15) {
    throw new Error('Public LLM limit reached or empty');
  }

  return text.trim();
}

// 8. Synthèse Analytique Haut de Gamme (Fallback Ultra-Riche si hors-ligne)
function generateDataDenseFallbackAnswer(query: string, data: any, memorizedFact: string | null): string {
  const q = query.toLowerCase().trim();
  const cur = data.business.currency || 'FCFA';
  const firstName = data.user.name.split(' ')[0] || data.user.name || 'cher commerçant';

  // A. Si un nouveau souvenir a été dicté
  if (memorizedFact) {
    return `🧠 **C'est bien noté dans ma mémoire d'entreprise !**\n\nJ'ai retenu : « **${memorizedFact}** ».\n\nJe tiendrai désormais compte de cette information dans toutes mes analyses futures pour **${data.business.name}**. Que souhaitez-vous savoir d'autre ?`;
  }

  // B. Salutations et politesses conversationnelles
  if (
    q === 'salut' ||
    q === 'bonjour' ||
    q === 'hello' ||
    q === 'coucou' ||
    q === 'yo' ||
    q === 'bonsoir' ||
    q === 'ça va' ||
    q === 'ca va' ||
    q === 'comment tu vas' ||
    q === 'comment vas-tu' ||
    q === 'tu vas bien' ||
    q.startsWith('salut ') ||
    q.startsWith('bonjour ')
  ) {
    return `Bonjour ${firstName} ! Ravi d'échanger avec vous. Comment se passe votre journée chez **${data.business.name}** ?\n\nJe suis à vos côtés pour surveiller vos finances et vous conseiller. Que souhaitez-vous regarder aujourd'hui : vos ventes, votre caisse, vos lots ou vos clients débiteurs ?`;
  }

  // C. Consultation de la mémoire du Copilote
  if (
    q.includes('que sais-tu sur moi') ||
    q.includes('que sais tu sur moi') ||
    q.includes('qu\'as-tu en mémoire') ||
    q.includes('qu as tu en memoire') ||
    q.includes('qu\'est-ce que tu sais') ||
    q.includes('qu est ce que tu sais') ||
    q.includes('te souviens-tu') ||
    q.includes('mes souvenirs') ||
    q.includes('ma mémoire') ||
    q === 'mémoire' ||
    q === 'memoire'
  ) {
    const memoryItems = (data.savedMemories || []).length > 0
      ? data.savedMemories.map((m: string) => `• ${m}`).join('\n')
      : '*(Vous ne m\'avez pas encore partagé de faits spécifiques. Dites-moi par exemple : « Rappelle-toi que mon fournisseur de riz me livre le mardi » pour enrichir ma mémoire !)*';

    return `🧠 **Voici ce que j'ai en mémoire sur vous et votre boutique :**\n\n` +
      `• **Responsable** : ${data.user.name} (${data.user.email})\n` +
      `• **Établissement** : ${data.business.name} (Secteur : ${data.business.sector}, Devise : ${cur})\n\n` +
      `📌 **Faits et règles personnalisées mémorisés :**\n${memoryItems}`;
  }

  // D. Modèle de message WhatsApp pour relance client
  if (q.includes('whatsapp') || q.includes('relance') || q.includes('message pour relancer') || q.includes('texte de relance')) {
    const debtor = data.debtors.list[0];
    const clientName = debtor?.name || 'Nom du client';
    const amountDue = debtor?.owed ? `${debtor.owed.toLocaleString('fr-FR')} ${cur}` : `15 000 ${cur}`;

    return `📱 **Modèle de message WhatsApp de relance prêt à envoyer :**\n\n` +
      `> *« Bonjour ${clientName}, j'espère que vous vous portez bien. Je vous contacte cordialement au sujet de votre facture en cours chez ${data.business.name} d'un montant de ${amountDue}. Pourriez-vous nous indiquer quand vous prévoyez d'effectuer votre règlement ? Merci beaucoup pour votre fidélité et excellente journée ! »*\n\n` +
      `💡 Vous pouvez aussi aller dans **Clients & Dettes**, ouvrir la fiche du client et cliquer directement sur l'icône WhatsApp verte pour l'envoyer en 1 clic !`;
  }

  // E. Comment faire / utilisation de l'application
  if (q.includes('comment faire') || q.includes('comment enregistrer') || q.includes('comment créer') || q.includes('comment clôturer') || q.includes('comment ajouter')) {
    if (q.includes('vente')) {
      return `🛍️ **Pour enregistrer une nouvelle vente :**\n\n1. Cliquez sur le bouton bleu **+ Vente** (en haut à droite de l'écran ou dans le menu *Ventes & Déballages*).\n2. Choisissez vos articles ou tapez directement le nom du produit et son prix.\n3. Sélectionnez le mode de règlement (**Espèces**, **Mobile Money** ou **Crédit/Ardoise** si le client paie plus tard).\n4. Validez : le stock est décompté automatiquement et vous pouvez imprimer ou partager le reçu WhatsApp au client !`;
    }
    if (q.includes('caisse')) {
      return `💼 **Pour clôturer votre caisse du soir :**\n\n1. Rendez-vous dans le menu **Caisse Journalière**.\n2. Cliquez sur le bouton **Clôturer la Caisse**.\n3. Comptez physiquement vos billets et pièces dans votre tiroir, puis saisissez le montant compté.\n4. Le système compare immédiatement avec le solde théorique. En cas d'écart, notez simplement la justification et validez pour sceller la journée !`;
    }
    if (q.includes('lot') || q.includes('campagne')) {
      return `📦 **Pour créer une nouvelle campagne de lots :**\n\n1. Allez dans le menu **Lots & Déballages**.\n2. Cliquez sur **+ Nouvelle Campagne**.\n3. Indiquez le type de marchandise (friperie, téléphones, etc.) et vos coûts (achat, transport, douane).\n4. Ajoutez la liste de vos articles avec le nouveau tableau rapide.\n5. Validez : COMMERCIA calcule automatiquement votre coût de revient unitaire (*Landed Cost*) et votre point mort !`;
    }
  }

  // F. Lots commerciaux et point mort
  if (q.includes('lot') || q.includes('campagne') || q.includes('point mort') || q.includes('remboursement') || q.includes('redmi') || q.includes('balle') || q.includes('friperie')) {
    if (data.commercialLots.length > 0) {
      const summaries = data.commercialLots.map((lot: any) => {
        return (
          `📦 **Campagne Active : "${lot.name}"** (${lot.goodsType})\n` +
          `• **Investissement global (Landed Cost)** : **${lot.totalLandedCost.toLocaleString('fr-FR')} ${cur}** (Achat + transport + douane)\n` +
          `• **Chiffre d'affaires déjà encaissé** : **${lot.totalRevenue.toLocaleString('fr-FR')} ${cur}** (${lot.totalUnitsSold} vendus sur ${lot.totalUnitsReceived})\n` +
          `• **Taux d'amortissement actuel** : **${lot.recoveryRate}% récupéré**\n` +
          `• **Somme restante pour point mort** : **${lot.remainingToBreakeven.toLocaleString('fr-FR')} ${cur}**\n` +
          `• **Nombre d'articles à écouler pour rentabilité 100%** : **${lot.unitsToBreakeven} article(s)** au prix moyen de ${lot.avgSellingPrice.toLocaleString('fr-FR')} ${cur}\n` +
          `• **Bénéfice net réalisé à ce jour** : **${lot.realizedProfit.toLocaleString('fr-FR')} ${cur}**\n` +
          `• **Stock restant en magasin** : **${lot.totalUnitsRemaining} articles**\n\n` +
          `🎯 **Recommandation Stratégique Copilote** : Avec seulement ${lot.unitsToBreakeven} pièce(s) restante(s) à vendre pour couvrir l'intégralité de vos coûts, vous entrez dans la zone de profit pur (100% net). Lancez un déballage VIP sur vos statuts WhatsApp pour liquider ce solde d'ici 48h !`
        );
      }).join('\n\n---\n\n');

      return `🚀 **Diagnostic Approfondi de vos Lots Commerciaux Pro :**\n\n${summaries}`;
    }
    return `📦 **Gestion des Lots Commerciaux :**\n\nVous n'avez pas de campagne active actuellement pour ${data.business.name}. Rendez-vous dans le menu **Lots Commerciaux** pour lancer un lot (friperie, arrivage ou cartons importés) et calculer immédiatement votre coût de revient débarqué et votre point mort.`;
  }

  // G. Bénéfice & Rentabilité
  if (q.includes('bénéfice') || q.includes('profit') || q.includes('marge') || q.includes('gagné') || q.includes('rentab')) {
    return (
      `📊 **Analyse de Rentabilité en Direct pour ${data.business.name} :**\n\n` +
      `• **Chiffre d'affaires encaissé aujourd'hui** : **${data.salesToday.revenue.toLocaleString('fr-FR')} ${cur}** (${data.salesToday.count} vente(s))\n` +
      `• **Charges et dépenses du jour** : **${data.expensesToday.total.toLocaleString('fr-FR')} ${cur}** (Exploitation: ${data.expensesToday.operating.toLocaleString('fr-FR')} ${cur}, Achats: ${data.expensesToday.inventory.toLocaleString('fr-FR')} ${cur})\n` +
      `• **Bénéfice Net Estimé du jour** : **${data.todayProfit.netProfit.toLocaleString('fr-FR')} ${cur}** (Taux de marge brute : ${data.todayProfit.grossMarginPercent}%)\n` +
      `• **Performance sur 7 jours** : Ventes de ${data.weekMetrics.revenue.toLocaleString('fr-FR')} ${cur} pour un bénéfice net de **${data.weekMetrics.netProfit.toLocaleString('fr-FR')} ${cur}**\n\n` +
      `💡 **Règle des 3 Poches COMMERCIA** :\n` +
      (data.todayProfit.netProfit >= 0
        ? `Votre journée est positive (+${data.todayProfit.netProfit.toLocaleString('fr-FR')} ${cur}). Mettez 70% de côté dans la Poche 1 pour réapprovisionner vos produits les plus demandés (${data.topProducts[0]?.name || 'vos articles phares'}), 15% pour les charges fixes (Poche 2) et conservez 15% pour votre rémunération personnelle (Poche 3).`
        : `Attention : vos charges du jour dépassent vos recettes actuelles. Évitez tout décaissement non urgent jusqu'à la prochaine rentrée de ventes.`)
    );
  }

  // H. Créances & Dettes clients
  if (q.includes('dette') || q.includes('crédit') || q.includes('qui me doit') || q.includes('doit') || q.includes('créance')) {
    if (data.debtors.count > 0) {
      const topList = data.debtors.list
        .map((d: any) => `• **${d.name}** : **${d.owed.toLocaleString('fr-FR')} ${cur}** 📱 ${d.phone}`)
        .join('\n');

      return (
        `👥 **État des Créances Clients en Attente (${data.business.name}) :**\n\n` +
        `Vous avez actuellement **${data.debtors.totalOwed.toLocaleString('fr-FR')} ${cur}** bloqués dehors auprès de **${data.debtors.count} client(s)** :\n\n` +
        `${topList}\n\n` +
        `🚀 **Action Recommandée Copilote** :\n` +
        `Dans le menu **Clients**, cliquez sur l'icône WhatsApp pour envoyer un rappel courtois. Récupérer ne serait-ce que la moitié de ces fonds (${Math.round(data.debtors.totalOwed / 2).toLocaleString('fr-FR')} ${cur}) renforcera immédiatement votre trésorerie disponible pour vos prochains approvisionnements.`
      );
    }
    return `🎉 **Félicitations pour votre gestion !** Aucun client ne vous doit de l'argent actuellement. Votre trésorerie est 100% sécurisée et liquide.`;
  }

  // I. Caisse journalière
  if (q.includes('caisse') || q.includes('fond') || q.includes('clôtur') || q.includes('cloture') || q.includes('espèces') || q.includes('momo') || q.includes('wave')) {
    return (
      `💼 **Contrôle du Journal de Caisse (${data.business.name}) :**\n\n` +
      `• **Statut actuel** : **${data.cash.isCashOpen ? '🟢 Caisse OUVERTE' : '🔴 Caisse CLÔTURÉE'}**\n` +
      `• **Fond de caisse de départ** : ${data.cash.initialCash.toLocaleString('fr-FR')} ${cur}\n` +
      `• **Entrées d'espèces (ventes liquide)** : +${data.cash.totalCashIn.toLocaleString('fr-FR')} ${cur}\n` +
      `• **Décaissements (dépenses / retraits)** : -${data.cash.totalCashOut.toLocaleString('fr-FR')} ${cur}\n` +
      `• **Mobile Money encaissé (Orange / MTN / Wave)** : 📱 ${data.cash.totalMomoIn.toLocaleString('fr-FR')} ${cur}\n` +
      `• **Espèces théoriques à avoir dans votre tiroir** : **${data.cash.theoreticalCash.toLocaleString('fr-FR')} ${cur}**\n\n` +
      `🔒 **Conseil du Soir** : À la fermeture, comptez soigneusement chaque billet. Le module de clôture COMMERCIA comparera votre comptage physique avec les ${data.cash.theoreticalCash.toLocaleString('fr-FR')} ${cur} théoriques pour détecter immédiatement tout écart.`
    );
  }

  // J. Stocks & alertes
  if (q.includes('stock') || q.includes('rupture') || q.includes('approvision') || q.includes('produit')) {
    if (data.stocks.lowStockCount > 0) {
      const stockList = data.stocks.lowStockList
        .map((p: any) => `• **${p.name}** : reste seulement **${p.quantity} ${p.unit}** (seuil : <= ${p.alertThreshold})`)
        .join('\n');

      return (
        `⚠️ **Alertes de Réapprovisionnement Prioritaire :**\n\n` +
        `Vous avez **${data.stocks.lowStockCount} article(s)** en stock critique :\n\n` +
        `${stockList}\n\n` +
        `📦 Passez commande sans tarder à vos fournisseurs habituels pour éviter des pertes d'opportunités de vente sur ces références clés.`
      );
    }
    return `📦 **Vos stocks sont sous contrôle !** Aucun produit n'a atteint le seuil d'alerte critique dans votre catalogue.`;
  }

  // K. Conseil d'affaires général
  return `Bonjour **${firstName}** ! Je suis à votre écoute pour optimiser la gestion de **${data.business.name}**.\n\nPosez-moi votre question en toute simplicité (ex: *"Quel est mon bénéfice aujourd'hui ?"*, *"Qui me doit de l'argent ?"*, *"Comment clôturer ma caisse ?"* ou *"Où en est mon lot ?"*) et je vous répondrai directement avec vos chiffres en main !`;
}

// 9. Chef d'Orchestre Principal : Traitement de la requête Chat IA
export async function handleCopilotChat(options: CopilotChatOptions): Promise<CopilotChatResult> {
  const { prisma, userId, businessId, message, history = [], userConfig, customApiKey } = options;

  // 1. Extraire et sauvegarder tout fait utilisateur
  const memorizedFact = extractMemoryTrigger(message);
  if (memorizedFact) {
    await persistBusinessMemory(prisma, businessId, memorizedFact);
  }

  // 2. Récupérer toutes les données en direct
  const storeData = await gatherLiveStoreData(prisma, businessId, userId);

  // 3. Construire le prompt système complet
  const systemPrompt = buildCommerciaMasterPrompt(storeData);

  // 4. Déterminer la clé d'API et le fournisseur
  const effectiveApiKey =
    customApiKey ||
    userConfig?.apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GROQ_API_KEY ||
    '';

  const provider =
    userConfig?.provider ||
    (process.env.GEMINI_API_KEY ? 'gemini' : process.env.OPENAI_API_KEY ? 'openai' : process.env.GROQ_API_KEY ? 'groq' : 'gemini');

  const model = userConfig?.model || (provider === 'gemini' ? 'gemini-1.5-flash' : provider === 'openai' ? 'gpt-4o-mini' : 'llama-3.3-70b-versatile');

  let finalReply = '';
  let providerUsed = '';

  // TENTATIVE 1 : Appel direct avec clé d'API utilisateur ou serveur
  if (effectiveApiKey && effectiveApiKey.trim().length > 10) {
    try {
      if (provider === 'gemini') {
        finalReply = await callGeminiApi(systemPrompt, message, history, effectiveApiKey, model);
        providerUsed = `Google Gemini (${model})`;
      } else if (provider === 'openai') {
        finalReply = await callOpenAICompatibleApi(systemPrompt, message, history, effectiveApiKey, model);
        providerUsed = `OpenAI (${model})`;
      } else if (provider === 'groq') {
        finalReply = await callOpenAICompatibleApi(
          systemPrompt,
          message,
          history,
          effectiveApiKey,
          model,
          'https://api.groq.com/openai/v1/chat/completions'
        );
        providerUsed = `Groq (${model})`;
      }
    } catch (llmErr: any) {
      console.warn('Échec de l\'appel LLM direct avec clé, bascule vers gateway publique :', llmErr.message);
    }
  }

  // TENTATIVE 2 : Passerelle LLM Générative Publique (sans clé requise)
  if (!finalReply) {
    try {
      finalReply = await callPublicGenerativeLLM(systemPrompt, message, history);
      providerUsed = 'LLM Génératif Avancé (GPT / Reasoning)';
    } catch (pubErr: any) {
      console.warn('Passerelle publique occupée ou indisponible, passage au moteur analytique direct :', pubErr.message);
    }
  }

  // TENTATIVE 3 : Moteur Analytique Concret de Secours (100% fondé sur les données réelles)
  if (!finalReply) {
    finalReply = generateDataDenseFallbackAnswer(message, storeData, memorizedFact);
    providerUsed = 'COMMERCIA Neural Contextual Engine (Données Réelles Temps Réel)';
  }

  // Si un souvenir a été extrait et n'est pas mentionné dans la réponse
  if (memorizedFact && !finalReply.toLowerCase().includes('mémorisé') && !finalReply.toLowerCase().includes('enregistré')) {
    finalReply = `🧠 **C'est bien noté dans ma mémoire d'entreprise !**\n\nJ'ai retenu : « *${memorizedFact}* ».\n\n${finalReply}`;
  }

  // 5. Sauvegarder dans la table conversation Prisma si conversationId existe ou en créer une
  let convId = options.conversationId;
  try {
    if (!convId) {
      const conv = await prisma.aIConversation.create({
        data: {
          userId,
          title: message.slice(0, 40) + '...',
        },
      });
      convId = conv.id;
    }

    if (convId) {
      await prisma.aIMessage.createMany({
        data: [
          { conversationId: convId, role: 'user', content: message },
          { conversationId: convId, role: 'assistant', content: finalReply },
        ],
      });
    }
  } catch (convErr) {
    // Si la création de message échoue, ne bloque pas le retour
    console.warn('Erreur lors de la sauvegarde du message en base :', convErr);
  }

  return {
    reply: finalReply,
    memorizedFact,
    providerUsed,
    conversationId: convId,
  };
}
