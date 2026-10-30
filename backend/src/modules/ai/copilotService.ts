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
    'note que',
    'garde en mémoire que',
    "n'oublie pas que",
    'mon fournisseur est',
    'mon fournisseur principal est',
    'mon livreur est',
    'notre politique de prix est',
    'notre règle est',
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
6. MÉMOIRE CONTINUE & FAITS APPRIS SUR CE COMMERCE :
============================================================
${memoriesList}

============================================================
7. CONNAISSANCE TOTALE DE L'APPLICATION COMMERCIA :
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
9. DIRECTIVES COMPORTEMENTALES DU COPILOTE IA :
============================================================
- Parle avec un français impeccable, naturel, chaleureux, professionnel et percutant.
- Réponds TOUJOURS avec une intelligence et une précision chirurgicales en citant directement les VRAIS CHIFFRES de la boutique ci-dessus.
- Ne réponds JAMAIS de façon générique ou floue ("consultez vos ventes"). Donne les montants exacts, les noms des produits, des clients ou des lots concernés.
- Si le commerçant demande une relance client, rédige directement le message WhatsApp complet et courtois prêt à être copié-collé, incluant le nom du client et le montant exact.
- Si le commerçant demande où en est son lot ou sa rentabilité, cite le taux de récupération exact et le nombre précis d'articles restant à écouler pour le point mort.
- Si le commerçant dit "Rappelle-toi que..." ou donne une consigne, confirme-lui avec enthousiasme que c'est mémorisé dans son dossier d'entreprise.
- Interdiction stricte de générer du code brut, des balises HTML ou des blocs JSON. Utilise du texte fluide, des puces claires et des mises en gras lisibles sur smartphone.`;
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
    model: 'openai-fast',
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
  const q = query.toLowerCase();
  const cur = data.business.currency || 'FCFA';

  if (memorizedFact) {
    return `🧠 **Information enregistrée avec succès dans la mémoire continue de votre entreprise !**\n\nJ'ai retenu : « **${memorizedFact}** ».\n\nJe tiendrai désormais compte de cette consigne dans toutes les recommandations et analyses futures pour **${data.business.name}**.`;
  }

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

  if (q.includes('dette') || q.includes('crédit') || q.includes('qui me doit') || q.includes('doit') || q.includes('relanc') || q.includes('créance')) {
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

  // Synthèse générale personnalisée
  return (
    `Bonjour **${data.user.name}** ! Je suis votre **Copilote IA COMMERCIA** 🤖.\n\n` +
    `Voici l'état instantané de votre établissement (**${data.business.name}**) :\n` +
    `• Ventes du jour : **${data.salesToday.revenue.toLocaleString('fr-FR')} ${cur}** (${data.salesToday.count} vente(s))\n` +
    `• Solde espèces en caisse : **${data.cash.theoreticalCash.toLocaleString('fr-FR')} ${cur}** (${data.cash.isCashOpen ? 'Caisse ouverte ✅' : 'Caisse fermée ⚠️'})\n` +
    `• Crédits clients à recouvrer : **${data.debtors.totalOwed.toLocaleString('fr-FR')} ${cur}** (${data.debtors.count} débiteurs)\n` +
    (data.stocks.lowStockCount > 0 ? `• Alertes stock : **${data.stocks.lowStockCount} article(s) à réapprovisionner**\n` : `• Alertes stock : Tout est au vert ✅\n`) +
    (data.commercialLots.length > 0 ? `• Campagne active de lot : **"${data.commercialLots[0].name}"** (${data.commercialLots[0].recoveryRate}% amorti)\n\n` : `\n`) +
    `💡 **Que souhaitez-vous examiner ?** Vous pouvez me demander :\n` +
    `1. *"Quel est mon bénéfice net réel aujourd'hui ?"*\n` +
    `2. *"Rédige-moi un message WhatsApp pour relancer mes clients débiteurs"*\n` +
    `3. *"Où en est le point mort de mon lot commercial ?"*\n` +
    `4. *"Rappelle-toi que mon fournisseur me livre chaque mardi"* (pour enrichir ma mémoire)`
  );
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
