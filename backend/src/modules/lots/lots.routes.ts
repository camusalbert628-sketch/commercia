import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getUserSubscriptionDetails } from '../../utils/subscriptionUtils';

const router = Router();
router.use(authenticate);

// Middleware checking Pro / Business subscription or Admin role
async function requireProSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentification requise.' });
    }

    const subDetails = await getUserSubscriptionDetails(req.prisma, userId);
    if (!subDetails.isPro && !subDetails.isAdmin) {
      return res.status(403).json({
        error: 'PRO_REQUIRED',
        message: 'Le module « Gestion des lots commerciaux » est réservé aux abonnés COMMERCIA PRO et BUSINESS.',
        subscription: subDetails,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 1. GET /api/lots/info - Informations publiques sur le module (accessible à tous)
// -------------------------------------------------------------
router.get('/info', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  let isPro = false;
  if (userId) {
    try {
      const sub = await getUserSubscriptionDetails(req.prisma, userId);
      isPro = Boolean(sub.isPro || sub.isAdmin);
    } catch (_) {}
  }

  res.json({
    moduleName: 'Gestion des lots commerciaux',
    version: '1.0.0-pro',
    isPro,
    benefits: [
      {
        title: 'Rentabilité unitaire au centime',
        description: 'Décomposez n\'importe quel achat en gros (balles de friperie, cartons Alibaba, containers) en articles individuels avec leur coût de revient exact.',
      },
      {
        title: 'Ventilation automatique des frais d\'approche',
        description: 'Répartissez intelligemment les frais de fret, douane, manutention, change et transport au prorata des articles ou de leur valeur marchande.',
      },
      {
        title: 'Suivi du point mort de chaque lot',
        description: 'Visualisez en temps réel le taux de récupération de votre investissement initial : sachez exactement à partir de quelle vente votre balle commence à générer du bénéfice pur.',
      },
      {
        title: 'Ventes multi-canaux & déstockage',
        description: 'Vendez vos articles au comptoir, sur WhatsApp, Facebook ou TikTok tout en décrémentant le stock restant et en calculant votre marge nette réelle.',
      },
      {
        title: 'Gestion simultanée de plusieurs campagnes',
        description: 'Gérez en parallèle vos balles de vêtements, vos lots de téléphones et vos cartons de chaussures sans jamais mélanger leurs finances.',
      },
    ],
  });
});

// -------------------------------------------------------------
// TOUS LES ENDPOINTS CI-DESSOUS NÉCESSITENT L'ACCÈS PRO
// -------------------------------------------------------------
router.use(requireProSubscription);

// ===================== HELPER FUNCTIONS =====================

interface DepletionStats {
  isDepleted: boolean;
  registeredAt: string;
  registeredAtFormatted: string;
  depletedAt: string | null;
  depletedAtFormatted: string | null;
  totalDurationDays: number | null;
  totalDurationHours: number | null;
  totalDurationMinutes: number | null;
  durationLabel: string;
  daysActive: number;
  hoursActive: number;
  dailyVelocity: number;
  estimatedDaysToDeplete: number | null;
  estimatedDepletionDate: string | null;
  estimatedDepletionLabel: string | null;
}

interface ChannelRecommendation {
  channel: string;
  channelName: string;
  velocityScore: number;
  speedBadge: string;
  priority: 'HAUTE' | 'RECOMMANDÉE' | 'SECONDAIRE';
  estimatedDaysToSell: string;
  strategyTitle: string;
  recommendedAction: string;
  actionSteps: string[];
  suggestedOffer: string;
  copyableSalesScript: string;
  targetAudience: string;
  financialRationale: string;
  historicalVolumeOnThisChannel?: number;
}

function calculateDepletionStats(campaign: any, items: any[] = [], sales: any[] = []): DepletionStats {
  const registeredAtDate = new Date(campaign.createdAt);
  const totalReceived = items.reduce((s: number, i: any) => s + (i.quantityReceived || 0), 0);
  const totalSold = items.reduce((s: number, i: any) => s + (i.quantitySold || 0), 0);
  const totalRemaining = items.reduce((s: number, i: any) => s + (i.quantityRemaining || 0), 0);

  const isDepleted = totalRemaining === 0 && totalReceived > 0;
  const depletedAtDate = campaign.depletedAt
    ? new Date(campaign.depletedAt)
    : (isDepleted && sales.length > 0 ? new Date(sales[0].saleDate || sales[0].createdAt) : null);

  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const registeredAtFormatted = dateFormatter.format(registeredAtDate);
  const depletedAtFormatted = depletedAtDate ? dateFormatter.format(depletedAtDate) : null;

  if (isDepleted && depletedAtDate) {
    const diffMs = Math.max(0, depletedAtDate.getTime() - registeredAtDate.getTime());
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    let durationLabel = '';
    if (days > 0) {
      durationLabel = `Écoulé en ${days} jour${days > 1 ? 's' : ''}, ${hours}h et ${minutes}min`;
    } else if (hours > 0) {
      durationLabel = `Écoulé en ${hours}h et ${minutes}min`;
    } else {
      durationLabel = `Écoulé en ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    return {
      isDepleted: true,
      registeredAt: registeredAtDate.toISOString(),
      registeredAtFormatted,
      depletedAt: depletedAtDate.toISOString(),
      depletedAtFormatted,
      totalDurationDays: days,
      totalDurationHours: hours,
      totalDurationMinutes: minutes,
      durationLabel,
      daysActive: days,
      hoursActive: hours,
      dailyVelocity: days > 0 ? Number((totalSold / days).toFixed(1)) : totalSold,
      estimatedDaysToDeplete: 0,
      estimatedDepletionDate: depletedAtDate.toISOString(),
      estimatedDepletionLabel: `Totalement épuisé le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(depletedAtDate)}`,
    };
  }

  // Active / non depleted campaign
  const nowMs = Date.now();
  const diffMs = Math.max(0, nowMs - registeredAtDate.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const daysActive = Math.floor(totalMinutes / (60 * 24));
  const hoursActive = Math.floor((totalMinutes % (60 * 24)) / 60);

  const durationLabel = daysActive > 0
    ? `En cours depuis ${daysActive} jour${daysActive > 1 ? 's' : ''} et ${hoursActive}h`
    : `Enregistré aujourd'hui (${hoursActive}h d'activité)`;

  const effectiveDays = Math.max(1, daysActive);
  const dailyVelocity = totalSold > 0 ? Number((totalSold / effectiveDays).toFixed(1)) : 0;

  let estimatedDaysToDeplete: number | null = null;
  let estimatedDepletionDate: string | null = null;
  let estimatedDepletionLabel: string | null = null;

  if (totalRemaining > 0) {
    if (dailyVelocity > 0) {
      estimatedDaysToDeplete = Math.ceil(totalRemaining / dailyVelocity);
      const estDate = new Date(nowMs + estimatedDaysToDeplete * 86400000);
      estimatedDepletionDate = estDate.toISOString();
      estimatedDepletionLabel = `Épuisement estimé dans ~${estimatedDaysToDeplete} jours (vers le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(estDate)}) au rythme actuel de ${dailyVelocity} pcs/jour`;
    } else {
      const benchmarkVelocity = Math.max(2, Math.round(totalReceived / 15));
      estimatedDaysToDeplete = Math.ceil(totalRemaining / benchmarkVelocity);
      const estDate = new Date(nowMs + estimatedDaysToDeplete * 86400000);
      estimatedDepletionDate = estDate.toISOString();
      estimatedDepletionLabel = `Aucune vente récente. Avec les canaux recommandés ci-dessous (~${benchmarkVelocity} pcs/j), épuisement possible en ~${estimatedDaysToDeplete} jours.`;
    }
  }

  return {
    isDepleted: false,
    registeredAt: registeredAtDate.toISOString(),
    registeredAtFormatted,
    depletedAt: null,
    depletedAtFormatted: null,
    totalDurationDays: null,
    totalDurationHours: null,
    totalDurationMinutes: null,
    durationLabel,
    daysActive,
    hoursActive,
    dailyVelocity,
    estimatedDaysToDeplete,
    estimatedDepletionDate,
    estimatedDepletionLabel,
  };
}

function generateFastSellingChannelRecommendations(
  campaign: any,
  financials: any,
  lotSales: any[] = []
): ChannelRecommendation[] {
  const goods = (campaign.goodsType || '').toLowerCase();
  const remaining = financials.totalQuantityRemaining || 0;
  const isRecovered = financials.isBreakevenReached;
  const recoveryRate = financials.recoveryRate || 0;
  const avgSellingPrice = financials.avgSellingPrice || 0;
  const remainingToBreakeven = financials.remainingToBreakeven || 0;

  const salesByChannel: Record<string, number> = {};
  lotSales.forEach((s: any) => {
    const ch = s.channel || 'comptoir';
    salesByChannel[ch] = (salesByChannel[ch] || 0) + (s.netAmount || 0);
  });

  const recommendations: ChannelRecommendation[] = [];

  // 1. WHATSAPP BUSINESS & STATUTS VIP
  const waScore = goods.includes('vetement') || goods.includes('frip') || goods.includes('chauss') ? 97 : 93;
  const waPriceEx = avgSellingPrice > 0 ? avgSellingPrice.toLocaleString('fr-FR') : '3 500';
  recommendations.push({
    channel: 'whatsapp',
    channelName: 'WhatsApp Business & Statuts VIP',
    velocityScore: waScore,
    speedBadge: '⚡ Vente Flash (24h - 48h)',
    priority: 'HAUTE',
    estimatedDaysToSell: '24 à 48 heures',
    strategyTitle: 'Drop Exclusif en Statut & Listes VIP',
    recommendedAction: `Diffusez les articles restants en vidéos portées ou photos détourées sur vos statuts WhatsApp et dans vos listes de diffusion VIP avec compte à rebours ("Exclusivité 24h").`,
    actionSteps: [
      'Prenez 5 photos/vidéos courtes sous lumière naturelle des meilleures pièces.',
      'Publiez en statut WhatsApp à 12h30 ou 19h00 avec prix affiché en gros et appel à l\'action.',
      'Exigez une réservation ferme avec acompte Mobile Money pour bloquer l\'article.',
    ],
    suggestedOffer: isRecovered
      ? `Offre Liquidation : "Achetez 2 pièces à ${waPriceEx} FCFA, la 3ème est OFFERTE !" (Valable 24h)`
      : `Offre Flash Arrivage : "${waPriceEx} FCFA pièce. -15% supplémentaire pour toute commande avant ce soir 21h !"`,
    copyableSalesScript: `🔥 NOUVEL ARRIVAGE FLASH ! Les plus belles pièces de notre lot (${campaign.name}) viennent d'être déballées ! Quantité très limitée. Prix exceptionnel : ${waPriceEx} FCFA. Écrivez-nous tout de suite pour réserver la vôtre avant rupture ! 🚀`,
    targetAudience: 'Clients fidèles, contacts réguliers du carnet d\'adresses, acheteurs compulsifs.',
    financialRationale: recoveryRate < 50
      ? `Taux de récupération à ${recoveryRate}% : ce canal n'a aucun coût marketing (0 FCFA) et génère des encaissements cash immédiats pour rembourser vos ${remainingToBreakeven.toLocaleString('fr-FR')} FCFA restants.`
      : `Capital remboursé à ${recoveryRate}% : tout le cash encaissé sur WhatsApp est 100% du bénéfice net net pour votre trésorerie.`,
    historicalVolumeOnThisChannel: salesByChannel['whatsapp'] || 0,
  });

  // 2. TIKTOK LIVE & DÉBALLAGE EN DIRECT
  const ttScore = goods.includes('vetement') || goods.includes('frip') || goods.includes('cosmet') ? 94 : 88;
  recommendations.push({
    channel: 'tiktok',
    channelName: 'TikTok Live & Vidéos Déballage',
    velocityScore: ttScore,
    speedBadge: '🔥 Volume Massif (1 à 3 Lives)',
    priority: 'HAUTE',
    estimatedDaysToSell: '1 à 3 sessions Live',
    strategyTitle: 'Vente Interactive Déballage / Essayage en Direct',
    recommendedAction: `Organisez un live TikTok de 45 à 90 minutes où vous présentez les ${remaining} articles restants un par un avec un numéro étiqueté. Les spectateurs réservent directement par commentaire.`,
    actionSteps: [
      'Numérotez les articles restants de 1 à ' + Math.min(50, remaining) + ' avec des étiquettes visibles.',
      'Lancez un live avec un titre accrocheur : "Déstockage massif / Premier arrivé premier servi".',
      'Encaissez instantanément par Mobile Money pendant le direct et préparez les colis.',
    ],
    suggestedOffer: `Packs Flash en Live : "Le portant complet à prix unique choc ou 3 articles = livraison gratuite offerte".`,
    copyableSalesScript: `🔴 EN DIRECT MAINTENANT ! Grand déballage du lot ${campaign.name} ! Pièces uniques à saisir tout de suite. Rejoignez le live pour choisir vos articles avant que tout ne parte ! 🛍️`,
    targetAudience: 'Audience jeune, acheteurs en ligne impulsifs, chasseurs de bonnes affaires.',
    financialRationale: `Le format Live supprime la friction d'achat et permet de liquider 30 à 60 articles en une seule session.`,
    historicalVolumeOnThisChannel: salesByChannel['tiktok'] || 0,
  });

  // 3. VENTE FLASH COMPTOIR & PACKS BOUTIQUE
  const comptoirScore = 87;
  recommendations.push({
    channel: 'comptoir',
    channelName: 'Vente Flash Comptoir & Pack Déstockage',
    velocityScore: comptoirScore,
    speedBadge: '🏪 Vente Directe Boutique (3-5 jours)',
    priority: 'RECOMMANDÉE',
    estimatedDaysToSell: '3 à 5 jours',
    strategyTitle: 'Mise en Avant Tête de Gondole & Vente Croisée',
    recommendedAction: `Placez les articles du lot bien en vue à l'entrée de la boutique ou sur le comptoir avec une affiche percutante. Proposez-les systématiquement en vente additionnelle à chaque client en caisse.`,
    actionSteps: [
      'Aménagez une table ou un portant "Sélection Spéciale Arrivage" à l\'entrée.',
      'Formez les vendeurs à proposer l\'article à chaque passage en caisse.',
      'Affichez une réduction immédiate pour l\'achat groupé de 2 ou 3 articles.',
    ],
    suggestedOffer: `Offre Panier : "Pour tout achat en boutique, repartez avec cet article du lot pour seulement ${Math.round(avgSellingPrice * 0.8).toLocaleString('fr-FR')} FCFA au lieu de ${avgSellingPrice.toLocaleString('fr-FR')} FCFA !"`,
    copyableSalesScript: `📢 Spécial en boutique cette semaine : arrivage direct et déstockage exclusif sur notre lot ${campaign.name} ! Venez découvrir et essayer sur place.`,
    targetAudience: 'Clients de passage, clientèle locale du quartier, habitués de la boutique.',
    financialRationale: `0 coût de livraison, 0 risque de retour. Encaissement cash physique immédiat.`,
    historicalVolumeOnThisChannel: salesByChannel['comptoir'] || 0,
  });

  // 4. DEMI-GROS / REVENDEURS & COMMERÇANTS PARTENAIRES
  const revendeursScore = isRecovered || recoveryRate >= 70 ? 92 : 81;
  recommendations.push({
    channel: 'revendeurs',
    channelName: 'Demi-Gros / Revendeurs & Partenaires',
    velocityScore: revendeursScore,
    speedBadge: '📦 Liquidation Express en Bloc (24h - 48h)',
    priority: isRecovered ? 'HAUTE' : 'RECOMMANDÉE',
    estimatedDaysToSell: '24 à 48 heures',
    strategyTitle: 'Cession en Gros / Demi-Gros pour Liquider le Stock Restant',
    recommendedAction: `Proposez les ${remaining} articles restants en 2 ou 3 packs à des revendeurs de marché ou marchands partenaires avec une petite marge unitaire garantie.`,
    actionSteps: [
      'Regroupez les articles en packs de 15, 25 ou 50 pièces homogènes.',
      'Fixez un prix de gros attrayant (coût de revient + 20-25%).',
      'Contactez directement 3 revendeurs de confiance par téléphone pour une reprise en bloc.',
    ],
    suggestedOffer: `Pack Revendeur : "${Math.min(30, remaining)} pièces cédées en lot unique à prix grossiste pour libérer votre espace de stockage immédiatement".`,
    copyableSalesScript: `Bonjour, j'ai un stock disponible de ${remaining} pièces de qualité (${campaign.goodsType}) prêtes à la revente avec une excellente marge pour vous. Je cède le lot complet en demi-gros. Si intéressé, appelez-moi pour voir les pièces aujourd'hui !`,
    targetAudience: 'Boutiquiers partenaires, revendeurs indépendants, vendeuses ambulantes.',
    financialRationale: isRecovered
      ? `Vous avez déjà rentabilisé le lot ! Vendre en bloc à un revendeur vous permet d'encaisser 100% de bénéfice net d'un seul coup sans perdre de temps au détail.`
      : `Permet de solder rapidement le montant restant à rembourser (${remainingToBreakeven.toLocaleString('fr-FR')} FCFA) en une seule transaction.`,
    historicalVolumeOnThisChannel: salesByChannel['autre'] || 0,
  });

  // 5. FACEBOOK MARKETPLACE & GROUPES LOCAUX
  const fbScore = goods.includes('electr') || goods.includes('tel') ? 95 : 78;
  recommendations.push({
    channel: 'facebook',
    channelName: 'Facebook Marketplace & Groupes d\'Achat/Vente',
    velocityScore: fbScore,
    speedBadge: '💬 Vente Locale Gratuite (3 à 7 jours)',
    priority: 'SECONDAIRE',
    estimatedDaysToSell: '3 à 7 jours',
    strategyTitle: 'Multi-diffusion dans les Groupes de Vente de votre Ville',
    recommendedAction: `Publiez 3 à 5 annonces ciblées sur Facebook Marketplace et partagez-les dans les groupes locaux de votre ville (ex: "Achats / Ventes Douala", "Bons plans Abidjan", etc.).`,
    actionSteps: [
      'Créez une annonce Marketplace avec localisation précise.',
      'Partagez l\'annonce dans 10 groupes d\'achats/ventes actifs de votre ville.',
      'Répondez immédiatement aux messages Messenger avec votre contact WhatsApp.',
    ],
    suggestedOffer: `Livraison rapide le jour même offerte pour toute commande passée avant 14h.`,
    copyableSalesScript: `Disponibles en quantité limitée ! Articles ${campaign.goodsType} neufs / premier choix (${campaign.name}). Prix promo exceptionnel : ${avgSellingPrice.toLocaleString('fr-FR')} FCFA. Contactez-moi par WhatsApp ou Messenger pour livraison rapide aujourd'hui !`,
    targetAudience: 'Utilisateurs Facebook locaux en recherche active de bonnes affaires.',
    financialRationale: `Canal gratuit avec une portée massive locale pour toucher des personnes en dehors de votre cercle habituel.`,
    historicalVolumeOnThisChannel: salesByChannel['facebook'] || 0,
  });

  recommendations.sort((a, b) => b.velocityScore - a.velocityScore);
  return recommendations;
}

// -------------------------------------------------------------
// 2. GET /api/lots/overview - Synthèse consolidée de toutes les campagnes
// -------------------------------------------------------------
router.get('/overview', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);

    const campaigns = await prisma.commercialLotCampaign.findMany({
      where: { businessId },
      include: {
        items: true,
        sales: {
          include: { items: true },
        },
        expenses: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalInvested = 0;
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalVariableCosts = 0;
    let totalAdditionalExpenses = 0;
    let totalRemainingStockCost = 0;
    let totalRemainingStockMarketValue = 0;
    let activeCampaignsCount = 0;
    let closedCampaignsCount = 0;

    const campaignsSummary = campaigns.map((camp: any) => {
      const invested = camp.totalLandedCost || 0;
      totalInvested += invested;

      if (camp.status === 'active') activeCampaignsCount++;
      if (camp.status === 'closed') closedCampaignsCount++;

      // Total received & remaining
      const totalQuantityReceived = camp.items.reduce((s: number, i: any) => s + (i.quantityReceived || 0), 0);
      const totalQuantitySold = camp.items.reduce((s: number, i: any) => s + (i.quantitySold || 0), 0);
      const totalQuantityDefective = camp.items.reduce((s: number, i: any) => s + (i.quantityDefective || 0), 0);
      const totalQuantityRemaining = camp.items.reduce((s: number, i: any) => s + (i.quantityRemaining || 0), 0);

      // Remaining stock values
      const remainingCostValue = camp.items.reduce((s: number, i: any) => s + (i.quantityRemaining * (i.unitCost || 0)), 0);
      const remainingMarketValue = camp.items.reduce((s: number, i: any) => s + (i.quantityRemaining * (i.estimatedSellingPrice || 0)), 0);
      totalRemainingStockCost += remainingCostValue;
      totalRemainingStockMarketValue += remainingMarketValue;

      // Sales
      const validSales = camp.sales.filter((s: any) => s.paymentStatus !== 'cancelled' && s.paymentStatus !== 'refunded');
      const campRevenue = validSales.reduce((s: number, sale: any) => s + (sale.netAmount || sale.totalAmount || 0), 0);
      const campVariableCosts = validSales.reduce((s: number, sale: any) => s + (sale.variableCosts || 0), 0);
      totalRevenue += campRevenue;
      totalVariableCosts += campVariableCosts;

      // COGS
      const campCogs = validSales.reduce((s: number, sale: any) => {
        const saleCogs = sale.items.reduce((itemSum: number, item: any) => itemSum + (item.totalCost || (item.quantity * item.unitCost) || 0), 0);
        return s + saleCogs;
      }, 0);
      totalCogs += campCogs;

      // Expenses
      const campExpenses = camp.expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
      totalAdditionalExpenses += campExpenses;

      // Realized profit = Revenue - COGS - VariableCosts - AdditionalExpenses
      const realizedProfit = campRevenue - campCogs - campVariableCosts - campExpenses;

      // Capital recovery rate = Net cash collected / Invested * 100
      const netCashCollected = campRevenue - campVariableCosts - campExpenses;
      const recoveryRate = invested > 0 ? Number(((netCashCollected / invested) * 100).toFixed(1)) : 0;
      const isBreakevenReached = netCashCollected >= invested;

      // Depletion stats & Channel recommendations
      const depletionStats = calculateDepletionStats(camp, camp.items, validSales);
      const financialsForRec = {
        totalLandedCost: invested,
        totalRevenue: campRevenue,
        totalQuantityRemaining,
        recoveryRate,
        isBreakevenReached,
        remainingToBreakeven: Math.max(0, invested - netCashCollected),
        avgSellingPrice: totalQuantitySold > 0 ? Math.round(campRevenue / totalQuantitySold) : 0,
        avgUnitCost: totalQuantityReceived > 0 ? Math.round(invested / totalQuantityReceived) : 0,
      };
      const recs = generateFastSellingChannelRecommendations(camp, financialsForRec, validSales);
      const topRecommendedChannel = recs[0] || null;

      return {
        id: camp.id,
        name: camp.name,
        goodsType: camp.goodsType,
        supplierName: camp.supplierName,
        originCountry: camp.originCountry,
        purchaseDate: camp.purchaseDate,
        purchasePriceOriginal: camp.purchasePriceOriginal,
        purchaseCurrency: camp.purchaseCurrency,
        totalLandedCost: invested,
        status: camp.status,
        createdAt: camp.createdAt,
        depletedAt: camp.depletedAt,
        depletionStats,
        topRecommendedChannel,
        totalQuantityReceived,
        totalQuantitySold,
        totalQuantityDefective,
        totalQuantityRemaining,
        revenue: campRevenue,
        cogs: campCogs,
        variableCosts: campVariableCosts,
        additionalExpenses: campExpenses,
        realizedProfit,
        remainingStockCostValue: remainingCostValue,
        remainingStockMarketValue: remainingMarketValue,
        recoveryRate,
        isBreakevenReached,
        itemsCount: camp.items.length,
        salesCount: validSales.length,
      };
    });

    const totalRealizedProfit = totalRevenue - totalCogs - totalVariableCosts - totalAdditionalExpenses;
    const globalRecoveryRate = totalInvested > 0
      ? Number((((totalRevenue - totalVariableCosts - totalAdditionalExpenses) / totalInvested) * 100).toFixed(1))
      : 0;

    // Campaigns needing attention (recoveryRate < 50% or low margin)
    const campaignsNeedingAttention = campaignsSummary.filter(
      (c: any) => c.status === 'active' && c.recoveryRate < 60 && c.totalQuantitySold > 5
    );

    res.json({
      summary: {
        totalCampaigns: campaigns.length,
        activeCampaignsCount,
        closedCampaignsCount,
        totalInvested,
        totalRevenue,
        totalCogs,
        totalVariableCosts,
        totalAdditionalExpenses,
        totalRealizedProfit,
        totalRemainingStockCost,
        totalRemainingStockMarketValue,
        globalRecoveryRate,
      },
      campaignsNeedingAttention,
      campaigns: campaignsSummary,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 3. POST /api/lots/campaigns - Assistant de Création de Campagne
// -------------------------------------------------------------
const createCampaignSchema = z.object({
  name: z.string().min(2, 'Le nom de la campagne est requis'),
  goodsType: z.string().min(1, 'Le type de marchandises est requis'),
  description: z.string().optional(),
  supplierName: z.string().optional(),
  originCountry: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCurrency: z.string().default('XAF'),
  exchangeRate: z.number().positive().default(1.0),
  purchasePriceOriginal: z.number().nonnegative().default(0),
  transportCost: z.number().nonnegative().default(0),
  customsCost: z.number().nonnegative().default(0),
  transactionFees: z.number().nonnegative().default(0),
  packagingCost: z.number().nonnegative().default(0),
  otherSupplyCosts: z.number().nonnegative().default(0),
  costAllocationMethod: z.enum(['unit', 'value_weighted', 'custom']).default('unit'),
  status: z.enum(['draft', 'active', 'paused', 'closed']).default('active'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      name: z.string().min(1, 'Désignation article requise'),
      reference: z.string().optional(),
      category: z.string().optional(),
      variant: z.string().optional(),
      quantityReceived: z.number().int().positive('La quantité doit être >= 1'),
      estimatedSellingPrice: z.number().nonnegative().default(0),
      customUnitCost: z.number().nonnegative().optional(),
      notes: z.string().optional(),
    })
  ).min(1, 'Au moins un article doit être saisi dans le lot'),
});

router.post('/campaigns', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const parsed = createCampaignSchema.parse(req.body);

    const purchasePriceXaf = Math.round(parsed.purchasePriceOriginal * parsed.exchangeRate);
    const totalLandedCost = Math.round(
      purchasePriceXaf +
      parsed.transportCost +
      parsed.customsCost +
      parsed.transactionFees +
      parsed.packagingCost +
      parsed.otherSupplyCosts
    );

    // Compute unit costs for each item based on allocation method
    const totalUnits = parsed.items.reduce((s, it) => s + it.quantityReceived, 0);
    const totalEstimatedSalesValue = parsed.items.reduce(
      (s, it) => s + (it.quantityReceived * it.estimatedSellingPrice),
      0
    );

    const itemsWithCosts = parsed.items.map((it) => {
      let unitCost = 0;

      if (parsed.costAllocationMethod === 'unit') {
        // Equal per unit allocation
        unitCost = totalUnits > 0 ? Math.round((totalLandedCost / totalUnits) * 100) / 100 : 0;
      } else if (parsed.costAllocationMethod === 'value_weighted') {
        // Pro-rata based on expected selling price
        if (totalEstimatedSalesValue > 0 && it.estimatedSellingPrice > 0) {
          const itemWeight = (it.estimatedSellingPrice * it.quantityReceived) / totalEstimatedSalesValue;
          const totalCostForThisLine = totalLandedCost * itemWeight;
          unitCost = Math.round((totalCostForThisLine / it.quantityReceived) * 100) / 100;
        } else {
          unitCost = totalUnits > 0 ? Math.round((totalLandedCost / totalUnits) * 100) / 100 : 0;
        }
      } else if (parsed.costAllocationMethod === 'custom') {
        unitCost = it.customUnitCost || (totalUnits > 0 ? Math.round((totalLandedCost / totalUnits) * 100) / 100 : 0);
      }

      return {
        businessId,
        name: it.name.trim(),
        reference: it.reference?.trim() || null,
        category: it.category?.trim() || null,
        variant: it.variant?.trim() || null,
        quantityReceived: it.quantityReceived,
        quantitySold: 0,
        quantityDefective: 0,
        quantityRemaining: it.quantityReceived,
        estimatedSellingPrice: it.estimatedSellingPrice,
        unitCost,
        notes: it.notes?.trim() || null,
      };
    });

    const campaign = await prisma.commercialLotCampaign.create({
      data: {
        businessId,
        name: parsed.name.trim(),
        goodsType: parsed.goodsType.trim(),
        description: parsed.description?.trim() || null,
        supplierName: parsed.supplierName?.trim() || null,
        originCountry: parsed.originCountry?.trim() || null,
        purchaseDate: parsed.purchaseDate ? new Date(parsed.purchaseDate) : new Date(),
        purchaseCurrency: parsed.purchaseCurrency,
        exchangeRate: parsed.exchangeRate,
        purchasePriceOriginal: parsed.purchasePriceOriginal,
        purchasePriceXaf,
        transportCost: parsed.transportCost,
        customsCost: parsed.customsCost,
        transactionFees: parsed.transactionFees,
        packagingCost: parsed.packagingCost,
        otherSupplyCosts: parsed.otherSupplyCosts,
        totalLandedCost,
        costAllocationMethod: parsed.costAllocationMethod,
        status: parsed.status,
        notes: parsed.notes?.trim() || null,
        items: {
          create: itemsWithCosts,
        },
      },
      include: {
        items: true,
      },
    });

    // Enregistrer également une dépense automatique dans le grand livre si activé
    try {
      await prisma.expense.create({
        data: {
          businessId,
          amount: totalLandedCost,
          category: 'marchandise',
          description: `Achat Lot Commercial : ${campaign.name} (${campaign.goodsType})`,
          isFixedCost: false,
          isAcquisition: false,
          expenseDate: campaign.purchaseDate,
        },
      });
    } catch (expErr) {
      console.warn('Could not mirror lot purchase to global expenses:', expErr);
    }

    res.status(201).json({
      message: 'Campagne de lot commercial créée avec succès.',
      campaign,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 4. GET /api/lots/campaigns/:id - Détails exhaustifs d'une campagne
// -------------------------------------------------------------
router.get('/campaigns/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;

    const campaign = await prisma.commercialLotCampaign.findFirst({
      where: { id, businessId },
      include: {
        items: {
          orderBy: { name: 'asc' },
        },
        sales: {
          include: {
            items: {
              include: { lotItem: true },
            },
          },
          orderBy: { saleDate: 'desc' },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
        },
        movements: {
          include: { lotItem: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    });

    if (!campaign) {
      throw new AppError('Campagne de lot introuvable', 404);
    }

    // Calculs financiers rigoureux
    const invested = campaign.totalLandedCost || 0;
    const validSales = campaign.sales.filter((s: any) => s.paymentStatus !== 'cancelled' && s.paymentStatus !== 'refunded');

    const totalRevenue = validSales.reduce((s: number, sale: any) => s + (sale.netAmount || sale.totalAmount || 0), 0);
    const totalVariableCosts = validSales.reduce((s: number, sale: any) => s + (sale.variableCosts || 0), 0);

    const totalCogs = validSales.reduce((s: number, sale: any) => {
      return s + sale.items.reduce((itemSum: number, item: any) => itemSum + (item.totalCost || (item.quantity * item.unitCost) || 0), 0);
    }, 0);

    const totalAdditionalExpenses = campaign.expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);

    // Bénéfice net réalisé (déjà encaissé)
    const realizedProfit = totalRevenue - totalCogs - totalVariableCosts - totalAdditionalExpenses;

    // Encaissements nets pour calcul de remboursement
    const netCashCollected = totalRevenue - totalVariableCosts - totalAdditionalExpenses;
    const recoveryRate = invested > 0 ? Number(((netCashCollected / invested) * 100).toFixed(1)) : 0;
    const remainingToBreakeven = Math.max(0, invested - netCashCollected);
    const isBreakevenReached = netCashCollected >= invested;

    // Stock quantities & remaining values
    const totalQuantityReceived = campaign.items.reduce((s: number, i: any) => s + (i.quantityReceived || 0), 0);
    const totalQuantitySold = campaign.items.reduce((s: number, i: any) => s + (i.quantitySold || 0), 0);
    const totalQuantityDefective = campaign.items.reduce((s: number, i: any) => s + (i.quantityDefective || 0), 0);
    const totalQuantityRemaining = campaign.items.reduce((s: number, i: any) => s + (i.quantityRemaining || 0), 0);

    const remainingStockCostValue = campaign.items.reduce(
      (s: number, i: any) => s + (i.quantityRemaining * (i.unitCost || 0)),
      0
    );
    const remainingStockMarketValue = campaign.items.reduce(
      (s: number, i: any) => s + (i.quantityRemaining * (i.estimatedSellingPrice || 0)),
      0
    );
    const potentialFutureProfit = Math.max(0, remainingStockMarketValue - remainingStockCostValue);

    // Marge contributive unitaire moyenne
    const avgSellingPrice = totalQuantitySold > 0 ? Math.round(totalRevenue / totalQuantitySold) : 0;
    const avgUnitCost = totalQuantityReceived > 0 ? Math.round(invested / totalQuantityReceived) : 0;
    const avgMcvu = Math.max(0, avgSellingPrice - avgUnitCost);

    // Nombre d'unités restantes à vendre pour point mort
    const unitsToBreakeven = avgMcvu > 0 ? Math.ceil(remainingToBreakeven / avgMcvu) : 0;

    const financialsData = {
      totalLandedCost: invested,
      totalRevenue,
      totalCogs,
      totalVariableCosts,
      totalAdditionalExpenses,
      realizedProfit,
      netCashCollected,
      recoveryRate,
      remainingToBreakeven,
      isBreakevenReached,
      totalQuantityReceived,
      totalQuantitySold,
      totalQuantityDefective,
      totalQuantityRemaining,
      remainingStockCostValue,
      remainingStockMarketValue,
      potentialFutureProfit,
      avgSellingPrice,
      avgUnitCost,
      avgMcvu,
      unitsToBreakeven,
    };

    const depletionStats = calculateDepletionStats(campaign, campaign.items, validSales);
    const channelRecommendations = generateFastSellingChannelRecommendations(campaign, financialsData, validSales);

    res.json({
      campaign,
      financials: financialsData,
      depletionStats,
      channelRecommendations,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 4b. GET /api/lots/campaigns/:id/channel-recommendations - Suggestions Vente Rapide
// -------------------------------------------------------------
router.get('/campaigns/:id/channel-recommendations', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;

    const campaign = await prisma.commercialLotCampaign.findFirst({
      where: { id, businessId },
      include: {
        items: true,
        sales: {
          include: { items: true },
        },
        expenses: true,
      },
    });

    if (!campaign) {
      throw new AppError('Campagne de lot introuvable', 404);
    }

    const invested = campaign.totalLandedCost || 0;
    const validSales = campaign.sales.filter((s: any) => s.paymentStatus !== 'cancelled' && s.paymentStatus !== 'refunded');
    const totalRevenue = validSales.reduce((s: number, sale: any) => s + (sale.netAmount || sale.totalAmount || 0), 0);
    const totalVariableCosts = validSales.reduce((s: number, sale: any) => s + (sale.variableCosts || 0), 0);
    const totalExpenses = campaign.expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const netCashCollected = totalRevenue - totalVariableCosts - totalExpenses;
    const recoveryRate = invested > 0 ? Number(((netCashCollected / invested) * 100).toFixed(1)) : 0;
    const totalQuantitySold = campaign.items.reduce((s: number, i: any) => s + (i.quantitySold || 0), 0);
    const totalQuantityReceived = campaign.items.reduce((s: number, i: any) => s + (i.quantityReceived || 0), 0);
    const totalQuantityRemaining = campaign.items.reduce((s: number, i: any) => s + (i.quantityRemaining || 0), 0);

    const financialsData = {
      totalLandedCost: invested,
      totalRevenue,
      totalQuantityRemaining,
      recoveryRate,
      isBreakevenReached: netCashCollected >= invested,
      remainingToBreakeven: Math.max(0, invested - netCashCollected),
      avgSellingPrice: totalQuantitySold > 0 ? Math.round(totalRevenue / totalQuantitySold) : 0,
      avgUnitCost: totalQuantityReceived > 0 ? Math.round(invested / totalQuantityReceived) : 0,
    };

    const recommendations = generateFastSellingChannelRecommendations(campaign, financialsData, validSales);

    res.json({
      campaignId: id,
      campaignName: campaign.name,
      goodsType: campaign.goodsType,
      recommendations,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 5. PATCH /api/lots/campaigns/:id/status - Changer le statut
// -------------------------------------------------------------
router.patch('/campaigns/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'active', 'paused', 'closed'].includes(status)) {
      throw new AppError('Statut invalide', 400);
    }

    const campaign = await prisma.commercialLotCampaign.findFirst({
      where: { id, businessId },
    });

    if (!campaign) {
      throw new AppError('Campagne introuvable', 404);
    }

    const updated = await prisma.commercialLotCampaign.update({
      where: { id },
      data: {
        status,
        closedAt: status === 'closed' ? new Date() : null,
      },
    });

    res.json({
      message: `Statut de la campagne mis à jour en "${status}"`,
      campaign: updated,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 6. POST /api/lots/campaigns/:id/sales - Enregistrer une vente sur le lot
// -------------------------------------------------------------
const recordLotSaleSchema = z.object({
  saleDate: z.string().optional(),
  channel: z.enum(['comptoir', 'whatsapp', 'facebook', 'instagram', 'site_web', 'autre']).default('comptoir'),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  discountAmount: z.number().nonnegative().default(0),
  variableCosts: z.number().nonnegative().default(0),
  paymentMethod: z.enum(['cash', 'mobile_money', 'bank_transfer', 'credit']).default('cash'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      lotItemId: z.string().uuid(),
      quantity: z.number().int().positive('La quantité doit être >= 1'),
      unitPrice: z.number().positive('Le prix unitaire doit être > 0'),
    })
  ).min(1, 'Au moins un article du lot doit être vendu'),
});

router.post('/campaigns/:id/sales', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id: campaignId } = req.params;
    const parsed = recordLotSaleSchema.parse(req.body);

    const campaign = await prisma.commercialLotCampaign.findFirst({
      where: { id: campaignId, businessId },
      include: { items: true },
    });

    if (!campaign) {
      throw new AppError('Campagne de lot introuvable', 404);
    }

    if (campaign.status === 'closed') {
      throw new AppError('Impossible d\'enregistrer une vente sur une campagne clôturée.', 400);
    }

    // Verify stock availability
    for (const itemInput of parsed.items) {
      const lotItem = campaign.items.find((i: any) => i.id === itemInput.lotItemId);
      if (!lotItem) {
        throw new AppError(`Article ID ${itemInput.lotItemId} introuvable dans ce lot`, 404);
      }
      if (lotItem.quantityRemaining < itemInput.quantity) {
        throw new AppError(
          `Stock insuffisant pour "${lotItem.name}". Demandé: ${itemInput.quantity}, restant: ${lotItem.quantityRemaining}`,
          400
        );
      }
    }

    // Compute totals & sale items with COGS snapshot
    let subtotal = 0;
    const saleItemsData = parsed.items.map((itemInput) => {
      const lotItem = campaign.items.find((i: any) => i.id === itemInput.lotItemId)!;
      const lineTotal = itemInput.quantity * itemInput.unitPrice;
      const lineCost = itemInput.quantity * lotItem.unitCost;
      const lineProfit = lineTotal - lineCost;
      subtotal += lineTotal;

      return {
        lotItemId: lotItem.id,
        quantity: itemInput.quantity,
        unitPrice: itemInput.unitPrice,
        unitCost: lotItem.unitCost,
        totalPrice: lineTotal,
        totalCost: lineCost,
        grossProfit: lineProfit,
      };
    });

    const netAmount = Math.max(0, subtotal - parsed.discountAmount);

    // Transaction for atomic sale creation + stock reduction + movement log
    const result = await prisma.$transaction(async (tx: any) => {
      const sale = await tx.lotSale.create({
        data: {
          campaignId,
          businessId,
          saleDate: parsed.saleDate ? new Date(parsed.saleDate) : new Date(),
          channel: parsed.channel,
          customerName: parsed.customerName?.trim() || null,
          customerPhone: parsed.customerPhone?.trim() || null,
          totalAmount: subtotal,
          discountAmount: parsed.discountAmount,
          netAmount,
          variableCosts: parsed.variableCosts,
          paymentMethod: parsed.paymentMethod,
          paymentStatus: 'paid',
          notes: parsed.notes?.trim() || null,
          items: {
            create: saleItemsData,
          },
        },
        include: { items: true },
      });

      // Update remaining quantity for each item & log stock movement
      for (const itemInput of parsed.items) {
        const lotItem = campaign.items.find((i: any) => i.id === itemInput.lotItemId)!;
        await tx.lotItem.update({
          where: { id: lotItem.id },
          data: {
            quantitySold: { increment: itemInput.quantity },
            quantityRemaining: { decrement: itemInput.quantity },
          },
        });

        await tx.lotStockMovement.create({
          data: {
            campaignId,
            lotItemId: lotItem.id,
            type: 'sale',
            quantity: -itemInput.quantity,
            reason: `Vente ${parsed.channel} - ${netAmount.toLocaleString('fr-FR')} FCFA`,
          },
        });
      }

      // Check if all items in the campaign are completely depleted
      const allRemainingItems = await tx.lotItem.findMany({
        where: { campaignId },
        select: { quantityRemaining: true },
      });
      const totalRemainingAfterSale = allRemainingItems.reduce((acc: number, it: any) => acc + (it.quantityRemaining || 0), 0);

      if (totalRemainingAfterSale === 0) {
        await tx.commercialLotCampaign.update({
          where: { id: campaignId },
          data: {
            depletedAt: new Date(),
            status: 'closed',
            closedAt: new Date(),
          },
        });
      }

      return sale;
    });

    res.status(201).json({
      message: 'Vente enregistrée avec succès sur le lot.',
      sale: result,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 7. POST /api/lots/campaigns/:id/expenses - Dépenses additionnelles du lot
// -------------------------------------------------------------
const addLotExpenseSchema = z.object({
  amount: z.number().positive('Le montant doit être > 0'),
  category: z.string().default('autre'),
  description: z.string().optional(),
  expenseDate: z.string().optional(),
});

router.post('/campaigns/:id/expenses', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id: campaignId } = req.params;
    const parsed = addLotExpenseSchema.parse(req.body);

    const campaign = await prisma.commercialLotCampaign.findFirst({
      where: { id: campaignId, businessId },
    });

    if (!campaign) {
      throw new AppError('Campagne introuvable', 404);
    }

    const expense = await prisma.lotExpense.create({
      data: {
        campaignId,
        businessId,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description?.trim() || null,
        expenseDate: parsed.expenseDate ? new Date(parsed.expenseDate) : new Date(),
      },
    });

    res.status(201).json({
      message: 'Dépense ajoutée à la campagne.',
      expense,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 8. POST /api/lots/campaigns/:id/stock-adjustments - Avaries / Pertes / Ajustements
// -------------------------------------------------------------
const stockAdjustmentSchema = z.object({
  lotItemId: z.string().uuid(),
  type: z.enum(['defective', 'adjustment', 'return']),
  quantity: z.number().int().positive('La quantité doit être >= 1'),
  reason: z.string().optional(),
});

router.post('/campaigns/:id/stock-adjustments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id: campaignId } = req.params;
    const parsed = stockAdjustmentSchema.parse(req.body);

    const lotItem = await prisma.lotItem.findFirst({
      where: { id: parsed.lotItemId, campaignId, businessId },
    });

    if (!lotItem) {
      throw new AppError('Article introuvable dans ce lot', 404);
    }

    if (parsed.type === 'defective') {
      if (lotItem.quantityRemaining < parsed.quantity) {
        throw new AppError('Stock insuffisant pour enregistrer cette perte.', 400);
      }
      await prisma.lotItem.update({
        where: { id: lotItem.id },
        data: {
          quantityDefective: { increment: parsed.quantity },
          quantityRemaining: { decrement: parsed.quantity },
        },
      });

      // Check if campaign is now depleted
      const allRemainingItems = await prisma.lotItem.findMany({
        where: { campaignId },
        select: { quantityRemaining: true },
      });
      const totalRemaining = allRemainingItems.reduce((acc: number, it: any) => acc + (it.quantityRemaining || 0), 0);
      if (totalRemaining === 0) {
        await prisma.commercialLotCampaign.update({
          where: { id: campaignId },
          data: {
            depletedAt: new Date(),
            status: 'closed',
            closedAt: new Date(),
          },
        });
      }
    } else if (parsed.type === 'return') {
      await prisma.lotItem.update({
        where: { id: lotItem.id },
        data: {
          quantitySold: { decrement: parsed.quantity },
          quantityRemaining: { increment: parsed.quantity },
        },
      });

      // Re-open if it was marked as depleted
      const currentCamp = await prisma.commercialLotCampaign.findUnique({ where: { id: campaignId } });
      if (currentCamp && currentCamp.depletedAt) {
        await prisma.commercialLotCampaign.update({
          where: { id: campaignId },
          data: {
            depletedAt: null,
            status: 'active',
            closedAt: null,
          },
        });
      }
    }

    await prisma.lotStockMovement.create({
      data: {
        campaignId,
        lotItemId: lotItem.id,
        type: parsed.type,
        quantity: parsed.type === 'return' ? parsed.quantity : -parsed.quantity,
        reason: parsed.reason?.trim() || `Ajustement: ${parsed.type}`,
      },
    });

    res.json({
      message: 'Mouvement de stock enregistré.',
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 9. POST /api/lots/campaigns/:id/items - Ajouter un nouvel article dans le lot
// -------------------------------------------------------------
const addItemSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  reference: z.string().optional(),
  category: z.string().optional(),
  variant: z.string().optional(),
  quantityReceived: z.number().int().positive('Quantité reçue >= 1'),
  estimatedSellingPrice: z.number().nonnegative().default(0),
  unitCost: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

router.post('/campaigns/:id/items', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = req.prisma;
    const businessId = await getTenantBusinessId(req);
    const { id: campaignId } = req.params;
    const parsed = addItemSchema.parse(req.body);

    const campaign = await prisma.commercialLotCampaign.findFirst({
      where: { id: campaignId, businessId },
    });

    if (!campaign) {
      throw new AppError('Campagne introuvable', 404);
    }

    const item = await prisma.lotItem.create({
      data: {
        campaignId,
        businessId,
        name: parsed.name.trim(),
        reference: parsed.reference?.trim() || null,
        category: parsed.category?.trim() || null,
        variant: parsed.variant?.trim() || null,
        quantityReceived: parsed.quantityReceived,
        quantitySold: 0,
        quantityDefective: 0,
        quantityRemaining: parsed.quantityReceived,
        estimatedSellingPrice: parsed.estimatedSellingPrice,
        unitCost: parsed.unitCost,
        notes: parsed.notes?.trim() || null,
      },
    });

    // Reopen campaign if it was previously depleted
    if (campaign.depletedAt) {
      await prisma.commercialLotCampaign.update({
        where: { id: campaignId },
        data: {
          depletedAt: null,
          status: 'active',
          closedAt: null,
        },
      });
    }

    res.status(201).json({
      message: 'Article ajouté au lot avec succès.',
      item,
    });
  } catch (err) {
    next(err);
  }
});

export const lotsRouter = router;
