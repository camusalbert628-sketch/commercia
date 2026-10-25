import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getUserSubscriptionDetails } from '../../utils/subscriptionUtils';

const router = Router();
router.use(authenticate);

// Initial default acquisition channels
const DEFAULT_CHANNELS = [
  { name: 'Facebook Ads', type: 'paid_social', color: '#1877F2', icon: 'Facebook', description: 'Publicités Meta Ads Facebook (Feed, Stories, Reels)' },
  { name: 'Instagram Ads', type: 'paid_social', color: '#E1306C', icon: 'Instagram', description: 'Campagnes sponsorisées Instagram' },
  { name: 'TikTok Ads', type: 'paid_social', color: '#000000', icon: 'Video', description: 'Vidéos sponsorisées TikTok for Business' },
  { name: 'Google Ads', type: 'search', color: '#4285F4', icon: 'Search', description: 'Recherche Google & Réseau Display' },
  { name: 'WhatsApp', type: 'direct', color: '#25D366', icon: 'MessageCircle', description: 'Statuts, diffusion et catalogue WhatsApp Business' },
  { name: 'Référencement naturel', type: 'organic', color: '#10B981', icon: 'Globe', description: 'Visites organiques Web & Google Search' },
  { name: 'Bouche-à-oreille & recommandations', type: 'referral', color: '#F59E0B', icon: 'Users', description: 'Recommandations clients et parrainage spontané' },
  { name: 'Influenceurs', type: 'influencer', color: '#8B5CF6', icon: 'Award', description: 'Partenariats créateurs de contenu & placement de produit' },
  { name: 'Affiliation', type: 'affiliation', color: '#EC4899', icon: 'Share2', description: 'Apporteurs d\'affaires commissionnés' },
  { name: 'Prospection directe', type: 'direct', color: '#0284C7', icon: 'PhoneCall', description: 'Appels, prospection terrain et démarchage B2B' },
  { name: 'Autres canaux personnalisés', type: 'other', color: '#64748B', icon: 'Layers', description: 'Canaux divers & événements' },
];

/**
 * Assure que l'entreprise dispose des canaux par défaut
 */
async function ensureDefaultChannels(prisma: any, businessId: string) {
  const count = await prisma.acquisitionChannel.count({ where: { businessId } });
  if (count === 0) {
    for (const c of DEFAULT_CHANNELS) {
      await prisma.acquisitionChannel.create({
        data: {
          businessId,
          name: c.name,
          type: c.type,
          color: c.color,
          icon: c.icon,
          description: c.description,
        },
      });
    }
  }
}

/**
 * Calculateur de date selon la période sélectionnée
 */
function getPeriodDateRange(period?: string, customStart?: string, customEnd?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);
  let label = 'Période';

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = "Aujourd'hui";
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      label = 'Hier';
      break;
    case 'last_7_days':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = 'Les 7 derniers jours';
      break;
    case 'last_30_days':
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = 'Les 30 derniers jours';
      break;
    case 'previous_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = 'Mois précédent';
      break;
    case 'quarter':
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = 'Trimestre en cours';
      break;
    case 'custom':
      if (customStart && customEnd) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        label = `Du ${start.toLocaleDateString('fr-FR')} au ${end.toLocaleDateString('fr-FR')}`;
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        label = 'Période personnalisée';
      }
      break;
    case 'current_month':
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = 'Mois en cours';
      break;
  }

  return { start, end, label };
}

// =========================================================================
// 1. GESTION DES CANAUX D'ACQUISITION
// =========================================================================

// GET /api/growth/channels — Liste des canaux
router.get('/channels', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    await ensureDefaultChannels(req.prisma, businessId);

    const channels = await req.prisma.acquisitionChannel.findMany({
      where: { businessId, isArchived: false },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { campaigns: true, sales: true, expenses: true, customers: true },
        },
      },
    });

    res.json(channels);
  } catch (error) {
    next(error);
  }
});

// POST /api/growth/channels — Créer un canal personnalisé
router.post('/channels', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const schema = z.object({
      name: z.string().min(1, 'Le nom du canal est requis'),
      type: z.string().default('other'),
      description: z.string().optional(),
      color: z.string().default('#0062FF'),
      icon: z.string().default('Globe'),
    });
    const data = schema.parse(req.body);

    const existing = await req.prisma.acquisitionChannel.findUnique({
      where: { businessId_name: { businessId, name: data.name } },
    });
    if (existing) {
      if (existing.isArchived) {
        const restored = await req.prisma.acquisitionChannel.update({
          where: { id: existing.id },
          data: { isArchived: false, isActive: true, description: data.description, color: data.color },
        });
        return res.json(restored);
      }
      throw new AppError('Un canal avec ce nom existe déjà.', 409);
    }

    const channel = await req.prisma.acquisitionChannel.create({
      data: {
        businessId,
        name: data.name,
        type: data.type,
        description: data.description || null,
        color: data.color,
        icon: data.icon,
      },
    });

    res.status(201).json(channel);
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// PUT /api/growth/channels/:id — Modifier un canal
router.put('/channels/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;
    const schema = z.object({
      name: z.string().min(1).optional(),
      type: z.string().optional(),
      description: z.string().nullable().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
      isActive: z.boolean().optional(),
      isArchived: z.boolean().optional(),
    });
    const data = schema.parse(req.body);

    const channel = await req.prisma.acquisitionChannel.findFirst({
      where: { id, businessId },
    });
    if (!channel) throw new AppError('Canal introuvable.', 404);

    const updated = await req.prisma.acquisitionChannel.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// DELETE /api/growth/channels/:id — Archiver un canal
router.delete('/channels/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;

    const channel = await req.prisma.acquisitionChannel.findFirst({
      where: { id, businessId },
    });
    if (!channel) throw new AppError('Canal introuvable.', 404);

    // Archiver pour préserver l'historique comptable
    await req.prisma.acquisitionChannel.update({
      where: { id },
      data: { isArchived: true, isActive: false },
    });

    res.json({ success: true, message: 'Canal archivé avec succès.' });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 2. GESTION DES CAMPAGNES D'ACQUISITION
// =========================================================================

// GET /api/growth/campaigns — Liste des campagnes
router.get('/campaigns', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { channelId, status } = req.query as any;

    const where: any = { businessId };
    if (channelId) where.channelId = channelId;
    if (status) where.status = status;

    const campaigns = await req.prisma.acquisitionCampaign.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        channel: true,
        _count: { select: { sales: true, expenses: true } },
      },
    });

    res.json(campaigns);
  } catch (error) {
    next(error);
  }
});

// POST /api/growth/campaigns — Créer une campagne
router.post('/campaigns', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const schema = z.object({
      channelId: z.string().min(1, 'Canal requis'),
      name: z.string().min(1, 'Nom de campagne requis'),
      startDate: z.string().optional(),
      endDate: z.string().nullable().optional(),
      budgetPlanned: z.number().min(0).default(0),
      actualSpend: z.number().min(0).default(0),
      leadsCount: z.number().int().min(0).default(0),
      status: z.enum(['active', 'completed', 'paused', 'draft']).default('active'),
      notes: z.string().optional(),
      recordExpense: z.boolean().default(false), // Enregistrer immédiatement comme dépense
    });
    const data = schema.parse(req.body);

    const channel = await req.prisma.acquisitionChannel.findFirst({
      where: { id: data.channelId, businessId },
    });
    if (!channel) throw new AppError('Canal d\'acquisition spécifié introuvable.', 404);

    const campaign = await req.prisma.acquisitionCampaign.create({
      data: {
        businessId,
        channelId: data.channelId,
        name: data.name,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        budgetPlanned: data.budgetPlanned,
        actualSpend: data.actualSpend,
        leadsCount: data.leadsCount,
        status: data.status,
        notes: data.notes || null,
      },
      include: { channel: true },
    });

    // Si demandé, synchroniser la dépense pub réelle dans les charges
    if (data.recordExpense && data.actualSpend > 0) {
      await req.prisma.expense.create({
        data: {
          businessId,
          channelId: data.channelId,
          campaignId: campaign.id,
          amount: data.actualSpend,
          category: 'publicite',
          description: `Budget engagé - Campagne ${data.name} (${channel.name})`,
          isAcquisition: true,
          expenseDate: data.startDate ? new Date(data.startDate) : new Date(),
        },
      });
    }

    res.status(201).json(campaign);
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// PUT /api/growth/campaigns/:id — Mettre à jour une campagne
router.put('/campaigns/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;
    const schema = z.object({
      channelId: z.string().optional(),
      name: z.string().min(1).optional(),
      startDate: z.string().optional(),
      endDate: z.string().nullable().optional(),
      budgetPlanned: z.number().min(0).optional(),
      actualSpend: z.number().min(0).optional(),
      leadsCount: z.number().int().min(0).optional(),
      status: z.enum(['active', 'completed', 'paused', 'draft']).optional(),
      notes: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);

    const existing = await req.prisma.acquisitionCampaign.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new AppError('Campagne introuvable.', 404);

    const updated = await req.prisma.acquisitionCampaign.update({
      where: { id },
      data: {
        ...(data.channelId ? { channelId: data.channelId } : {}),
        ...(data.name ? { name: data.name } : {}),
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
        ...(data.budgetPlanned !== undefined ? { budgetPlanned: data.budgetPlanned } : {}),
        ...(data.actualSpend !== undefined ? { actualSpend: data.actualSpend } : {}),
        ...(data.leadsCount !== undefined ? { leadsCount: data.leadsCount } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: { channel: true },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// DELETE /api/growth/campaigns/:id — Supprimer une campagne
router.delete('/campaigns/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;

    const existing = await req.prisma.acquisitionCampaign.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new AppError('Campagne introuvable.', 404);

    await req.prisma.acquisitionCampaign.delete({ where: { id } });
    res.json({ success: true, message: 'Campagne supprimée avec succès.' });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 3. MOTEUR DE CALCULS FINANCIERS & ANALYSE DE LA RENTABILITÉ
// =========================================================================

// GET /api/growth/analytics — Calcul complet et transparent selon la période
router.get('/analytics', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    await ensureDefaultChannels(req.prisma, businessId);

    const { period, startDate, endDate, channelId } = req.query as any;
    const { start, end, label } = getPeriodDateRange(period, startDate, endDate);

    // 1. Récupérer les canaux du commerce
    const channelsWhere: any = { businessId, isArchived: false };
    if (channelId) channelsWhere.id = channelId;
    const channels = await req.prisma.acquisitionChannel.findMany({
      where: channelsWhere,
      orderBy: { name: 'asc' },
    });

    // 2. Ventes admissibles sur la période (payées, complétées ou livrées)
    const sales = await req.prisma.sale.findMany({
      where: {
        businessId,
        saleDate: { gte: start, lte: end },
        status: { in: ['completed', 'paid', 'delivered'] },
      },
      include: {
        items: true,
        customer: true,
        channel: true,
      },
    });

    // 3. Ventes remboursées / annulées sur la période
    const refundedSales = await req.prisma.sale.findMany({
      where: {
        businessId,
        saleDate: { gte: start, lte: end },
        status: { in: ['refunded', 'cancelled'] },
      },
      include: { items: true },
    });

    // 4. Dépenses d'acquisition et publicitaires sur la période
    const acquisitionExpenses = await req.prisma.expense.findMany({
      where: {
        businessId,
        expenseDate: { gte: start, lte: end },
        OR: [
          { isAcquisition: true },
          { category: 'publicite' },
          { channelId: { not: null } },
        ],
      },
      include: { channel: true },
    });

    // 5. Charges fixes d'exploitation sur la période (pour calcul du point mort / seuil de rentabilité)
    const fixedExpenses = await req.prisma.expense.findMany({
      where: {
        businessId,
        expenseDate: { gte: start, lte: end },
        OR: [
          { isFixedCost: true },
          { category: { in: ['loyer', 'salaires', 'electricite', 'telephone', 'connexion', 'autre'] } },
        ],
        AND: [
          { isAcquisition: false },
          { category: { not: 'publicite' } },
        ],
      },
    });

    // 6. Campagnes actives / associées
    const campaigns = await req.prisma.acquisitionCampaign.findMany({
      where: {
        businessId,
        startDate: { lte: end },
        OR: [{ endDate: null }, { endDate: { gte: start } }],
      },
    });

    // 7. Détermination rigoureuse des Nouveaux Clients Acquis Uniques
    // Règle comptable : un client est comptabilisé comme nouveau s'il réalise son TOUT PREMIER achat
    // dans l'entreprise durant l'intervalle [start, end].
    const customerIdsInSales: string[] = Array.from(new Set(sales.filter((s: any) => s.customerId).map((s: any) => s.customerId as string)));
    
    // Pour chaque client, chercher son premier achat historique absolu
    const clientFirstSales = await Promise.all(
      customerIdsInSales.map(async (cid: string) => {
        const first = await req.prisma.sale.findFirst({
          where: {
            businessId,
            customerId: cid,
            status: { in: ['completed', 'paid', 'delivered'] },
          },
          orderBy: { saleDate: 'asc' },
          select: { id: true, saleDate: true, channelId: true },
        });
        return { customerId: cid, firstSale: first };
      })
    );

    const newCustomerIds = new Set<string>();
    const customerAcquisitionChannelMap = new Map<string, string>(); // customerId -> channelId

    for (const item of clientFirstSales) {
      if (item.firstSale) {
        const fDate = new Date(item.firstSale.saleDate);
        if (fDate >= start && fDate <= end) {
          newCustomerIds.add(item.customerId);
          if (item.firstSale.channelId) {
            customerAcquisitionChannelMap.set(item.customerId, item.firstSale.channelId);
          }
        }
      }
    }

    // Calcul par canal
    const channelStats = channels.map((channel: any) => {
      // Ventes attribuées à ce canal
      const channelSales = sales.filter((s: any) => s.channelId === channel.id);
      const channelRefunds = refundedSales.filter((s: any) => s.channelId === channel.id);

      // Chiffre d'affaires net = Somme des ventes admissibles nettes de remises - remboursements
      const grossRevenue = channelSales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
      const refundedRevenue = channelRefunds.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
      const netRevenue = Math.max(0, grossRevenue - refundedRevenue);

      // Quantités vendues
      const itemsSold = channelSales.reduce((sum: number, s: any) => {
        return sum + s.items.reduce((iSum: number, item: any) => iSum + (item.quantity || 1), 0);
      }, 0);

      // Coût des marchandises vendues (COGS)
      const cogs = channelSales.reduce((sum: number, s: any) => {
        return sum + s.items.reduce((iSum: number, item: any) => iSum + ((item.costPrice || 0) * (item.quantity || 1)), 0);
      }, 0);

      // Charges variables (unitaires des articles + charges variables spécifiques de la commande)
      const itemsVariableCosts = channelSales.reduce((sum: number, s: any) => {
        return sum + s.items.reduce((iSum: number, item: any) => iSum + ((item.variableCosts || 0) * (item.quantity || 1)), 0);
      }, 0);
      const orderVariableCosts = channelSales.reduce((sum: number, s: any) => sum + (s.variableCosts || 0), 0);
      const totalVariableCosts = itemsVariableCosts + orderVariableCosts;

      // Dépenses d'acquisition attribuées au canal (dépenses pub directes + budget engagé des campagnes du canal)
      const directExpenses = acquisitionExpenses
        .filter((e: any) => e.channelId === channel.id)
        .reduce((sum: number, e: any) => sum + e.amount, 0);

      // Campagnes du canal dans la période
      const channelCampaigns = campaigns.filter((c: any) => c.channelId === channel.id);
      const campaignActualSpend = channelCampaigns.reduce((sum: number, c: any) => sum + (c.actualSpend || 0), 0);
      const leadsCount = channelCampaigns.reduce((sum: number, c: any) => sum + (c.leadsCount || 0), 0);

      // Pour éviter les doubles comptabilisations : si l'utilisateur a enregistré une dépense liée à la campagne,
      // on prend le max entre dépenses enregistrées et spend campagne, ou la somme sans doublon.
      const acquisitionSpend = Math.max(directExpenses, campaignActualSpend);

      // Nouveaux clients acquis attribués à ce canal
      const newClientsForChannel = Array.from(newCustomerIds).filter(cid => {
        const cChanId = customerAcquisitionChannelMap.get(cid);
        if (cChanId) return cChanId === channel.id;
        // Fallback si la vente elle-même est sur le canal
        return channelSales.some((s: any) => s.customerId === cid);
      }).length;

      // Clients existants (commandes répétées de clients déjà acquis avant la période)
      const ordersCount = channelSales.length;
      const existingClientsOrders = channelSales.filter((s: any) => s.customerId && !newCustomerIds.has(s.customerId)).length;

      // CALCULS FINANCIERS OBLIGATOIRES
      // A. CAC (Coût d'Acquisition Client)
      // CAC = Dépenses d'acquisition / Nouveaux clients acquis
      const cac = newClientsForChannel > 0
        ? Number((acquisitionSpend / newClientsForChannel).toFixed(2))
        : null; // Non calculable si 0 nouveau client

      // B. Bénéfice après acquisition
      // Bénéfice = CA Net - Coût produits - Charges variables - Dépenses acquisition
      const profitAfterAcquisition = netRevenue - cogs - totalVariableCosts - acquisitionSpend;

      // Bénéfice par article
      const profitPerItem = itemsSold > 0
        ? Number((profitAfterAcquisition / itemsSold).toFixed(2))
        : 0;

      // C. ROAS (Return On Ad Spend)
      // ROAS = CA attribué / Dépenses pub
      const roas = acquisitionSpend > 0
        ? Number(((netRevenue / acquisitionSpend) * 100).toFixed(1))
        : null; // Non calculable si 0 dépense

      // D. Taux de conversion
      const conversionRate = leadsCount > 0
        ? Number(((newClientsForChannel / leadsCount) * 100).toFixed(1))
        : null;

      // E. Marge contributive
      const contributionMargin = netRevenue > 0
        ? Number((((netRevenue - cogs - totalVariableCosts) / netRevenue) * 100).toFixed(1))
        : 0;

      return {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        color: channel.color,
        icon: channel.icon,
        budgetPlanned: channelCampaigns.reduce((sum: number, c: any) => sum + (c.budgetPlanned || 0), 0),
        acquisitionSpend,
        leadsCount,
        newCustomersCount: newClientsForChannel,
        ordersCount,
        existingClientsOrders,
        itemsSold,
        grossRevenue,
        refundedRevenue,
        netRevenue,
        cogs,
        variableCosts: totalVariableCosts,
        profitAfterAcquisition,
        profitPerItem,
        cac,
        roas,
        conversionRate,
        contributionMargin,
        isProfitable: profitAfterAcquisition > 0,
      };
    });

    // Classement principal selon la RENTABILITÉ RÉELLE (bénéfice net généré)
    channelStats.sort((a: any, b: any) => b.profitAfterAcquisition - a.profitAfterAcquisition);

    // TOTAUX GLOBAUX
    const totalAcquisitionSpend = channelStats.reduce((sum: number, c: any) => sum + c.acquisitionSpend, 0);
    const totalLeads = channelStats.reduce((sum: number, c: any) => sum + c.leadsCount, 0);
    const totalNewCustomers = newCustomerIds.size;
    const totalOrders = channelStats.reduce((sum: number, c: any) => sum + c.ordersCount, 0);
    const totalItemsSold = channelStats.reduce((sum: number, c: any) => sum + c.itemsSold, 0);
    const totalGrossRevenue = channelStats.reduce((sum: number, c: any) => sum + c.grossRevenue, 0);
    const totalRefundedRevenue = channelStats.reduce((sum: number, c: any) => sum + c.refundedRevenue, 0);
    const totalNetRevenue = channelStats.reduce((sum: number, c: any) => sum + c.netRevenue, 0);
    const totalCogs = channelStats.reduce((sum: number, c: any) => sum + c.cogs, 0);
    const totalVariableCosts = channelStats.reduce((sum: number, c: any) => sum + c.variableCosts, 0);
    const totalProfitAfterAcquisition = totalNetRevenue - totalCogs - totalVariableCosts - totalAcquisitionSpend;

    // CAC Moyen Global
    const globalCac = totalNewCustomers > 0
      ? Number((totalAcquisitionSpend / totalNewCustomers).toFixed(2))
      : null;

    // ROAS Global
    const globalRoas = totalAcquisitionSpend > 0
      ? Number(((totalNetRevenue / totalAcquisitionSpend) * 100).toFixed(1))
      : null;

    // Panier moyen
    const averageOrderValue = totalOrders > 0
      ? Math.round(totalNetRevenue / totalOrders)
      : 0;

    // Taux de conversion global
    const globalConversionRate = totalLeads > 0
      ? Number(((totalNewCustomers / totalLeads) * 100).toFixed(1))
      : null;

    // Marge contributive globale
    const globalContributionMargin = totalNetRevenue > 0
      ? Number((((totalNetRevenue - totalCogs - totalVariableCosts) / totalNetRevenue) * 100).toFixed(1))
      : 0;

    // Charges fixes
    const totalFixedCosts = fixedExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const netOperatingProfit = totalProfitAfterAcquisition - totalFixedCosts;

    // CALCUL DU SEUIL DE RENTABILITÉ (BREAK-EVEN ANALYSIS)
    const avgSellingPrice = totalItemsSold > 0 ? totalNetRevenue / totalItemsSold : 0;
    const avgVariableCostPerUnit = totalItemsSold > 0 ? (totalCogs + totalVariableCosts) / totalItemsSold : 0;
    const mcvu = avgSellingPrice - avgVariableCostPerUnit;
    const tmcv = avgSellingPrice > 0 ? mcvu / avgSellingPrice : 0;
    const totalFixedAndAcquisitionBurden = totalFixedCosts + totalAcquisitionSpend;

    const breakEvenRevenue = tmcv > 0 ? Math.round(totalFixedAndAcquisitionBurden / tmcv) : null;
    const breakEvenUnits = mcvu > 0 ? Math.ceil(totalFixedAndAcquisitionBurden / mcvu) : null;
    const marginOfSafety = breakEvenRevenue !== null ? totalNetRevenue - breakEvenRevenue : null;
    const safetyIndex = totalNetRevenue > 0 && marginOfSafety !== null
      ? Number(((marginOfSafety / totalNetRevenue) * 100).toFixed(1))
      : null;

    // Budget pub maximal compatible avec rentabilité
    const maxCompatibleAdBudget = Math.max(0, Math.round(totalNetRevenue - totalCogs - totalVariableCosts - totalFixedCosts));

    res.json({
      period: {
        key: period || 'current_month',
        label,
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        totalAcquisitionSpend,
        totalLeads,
        totalNewCustomers,
        totalOrders,
        totalItemsSold,
        totalGrossRevenue,
        totalRefundedRevenue,
        totalNetRevenue,
        totalCogs,
        totalVariableCosts,
        totalProfitAfterAcquisition,
        totalFixedCosts,
        netOperatingProfit,
        globalCac,
        globalRoas,
        averageOrderValue,
        globalConversionRate,
        globalContributionMargin,
      },
      breakEven: {
        avgSellingPrice: Math.round(avgSellingPrice),
        avgVariableCostPerUnit: Math.round(avgVariableCostPerUnit),
        mcvu: Math.round(mcvu),
        tmcv: Number((tmcv * 100).toFixed(1)),
        breakEvenRevenue,
        breakEvenUnits,
        marginOfSafety,
        safetyIndex,
        maxCompatibleAdBudget,
      },
      channels: channelStats,
      bestChannel: channelStats[0] || null,
      sourceDataCounts: {
        admissibleSalesCount: sales.length,
        refundedSalesCount: refundedSales.length,
        expensesCount: acquisitionExpenses.length,
        campaignsCount: campaigns.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 4. RENTABILITÉ PAR PRODUIT / SERVICE & CALCUL DU CAC MAXIMAL SUPPORTABLE
// =========================================================================

router.get('/products-profitability', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const products = await req.prisma.product.findMany({
      where: { businessId, isArchived: false },
      include: {
        saleItems: {
          include: { sale: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const analysis = products.map((p: any) => {
      // Charges variables unitaires
      let variableBreakdown: any = {};
      try {
        variableBreakdown = JSON.parse(p.variableCostsBreakdown || '{}');
      } catch (_) {}

      const sellingPrice = p.sellingPrice || 0;
      const costPrice = p.costPrice || 0;
      const unitVariableCosts = p.variableCosts || 0;

      // Marge brute contributive unitaire avant acquisition
      const unitContributionMargin = Math.max(0, sellingPrice - costPrice - unitVariableCosts);

      // CAC maximal toléré (seuil où l'acquisition ne fait pas perdre d'argent sur le premier achat)
      const maxAcceptableCac = unitContributionMargin;

      // Ventes réelles
      const totalUnitsSold = p.saleItems
        .filter((si: any) => ['completed', 'paid', 'delivered'].includes(si.sale?.status))
        .reduce((sum: number, si: any) => sum + (si.quantity || 1), 0);

      const totalRevenue = totalUnitsSold * sellingPrice;
      const totalContributionProfit = totalUnitsSold * unitContributionMargin;

      return {
        id: p.id,
        name: p.name,
        reference: p.reference,
        category: p.category || 'Général',
        quantity: p.quantity,
        sellingPrice,
        costPrice,
        unitVariableCosts,
        unitContributionMargin,
        maxAcceptableCac,
        variableBreakdown,
        totalUnitsSold,
        totalRevenue,
        totalContributionProfit,
      };
    });

    // Trier par contribution au bénéfice
    analysis.sort((a: any, b: any) => b.totalContributionProfit - a.totalContributionProfit);

    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 5. COPILOTE IA STRATÉGIQUE (ANALYSE BASÉE SUR LES DONNÉES RÉELLES)
// =========================================================================

router.post('/ai-analysis', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { period, startDate, endDate } = req.body;
    const { start, end, label } = getPeriodDateRange(period, startDate, endDate);

    // Récupérer les ventes et canaux
    const channels = await req.prisma.acquisitionChannel.findMany({
      where: { businessId, isArchived: false },
    });
    const sales = await req.prisma.sale.findMany({
      where: {
        businessId,
        saleDate: { gte: start, lte: end },
        status: { in: ['completed', 'paid', 'delivered'] },
      },
      include: { items: true, channel: true },
    });
    const expenses = await req.prisma.expense.findMany({
      where: {
        businessId,
        expenseDate: { gte: start, lte: end },
        OR: [{ isAcquisition: true }, { category: 'publicite' }, { channelId: { not: null } }],
      },
    });

    const channelPerformance: Record<string, { name: string; revenue: number; spend: number; profit: number; newClients: number; cac: number | null }> = {};
    for (const c of channels) {
      channelPerformance[c.id] = { name: c.name, revenue: 0, spend: 0, profit: 0, newClients: 0, cac: null };
    }

    for (const s of sales) {
      if (s.channelId && channelPerformance[s.channelId]) {
        channelPerformance[s.channelId].revenue += s.totalAmount;
        const cogs = s.items.reduce((sum: number, i: any) => sum + (i.costPrice * i.quantity), 0);
        const vc = s.items.reduce((sum: number, i: any) => sum + (i.variableCosts * i.quantity), 0) + (s.variableCosts || 0);
        channelPerformance[s.channelId].profit += (s.totalAmount - cogs - vc);
      }
    }

    for (const e of expenses) {
      if (e.channelId && channelPerformance[e.channelId]) {
        channelPerformance[e.channelId].spend += e.amount;
      }
    }

    const perfList = Object.values(channelPerformance);
    const profitableChannels = perfList.filter((c: any) => (c.profit - c.spend) > 0).sort((a: any, b: any) => (b.profit - b.spend) - (a.profit - a.spend));
    const lossMakingChannels = perfList.filter((c: any) => c.spend > 0 && (c.profit - c.spend) < 0);
    const lowestCacChannel = perfList.filter((c: any) => c.cac !== null && c.cac > 0).sort((a: any, b: any) => a.cac! - b.cac!)[0];

    const recommendations: string[] = [];

    if (profitableChannels.length > 0) {
      const top = profitableChannels[0];
      recommendations.push(
        `🏆 **Canal le plus rentable** : "${top.name}" a généré le bénéfice net le plus élevé (${(top.profit - top.spend).toLocaleString('fr-FR')} FCFA après déduction des coûts et de la pub). C'est votre levier de croissance prioritaire.`
      );
    }

    if (lossMakingChannels.length > 0) {
      for (const l of lossMakingChannels) {
        recommendations.push(
          `⚠️ **Canal déficitaire détecté** : "${l.name}" a engagé ${l.spend.toLocaleString('fr-FR')} FCFA de dépenses pour un rendement insuffisant (perte nette de ${(l.spend - l.profit).toLocaleString('fr-FR')} FCFA). Il est urgent d'optimiser le ciblage ou de réduire ce budget.`
        );
      }
    } else {
      recommendations.push(
        `✅ **Aucun canal déficitaire** : Vos canaux d'acquisition actifs couvrent l'intégralité de leurs coûts publicitaires sur cette période.`
      );
    }

    if (lowestCacChannel) {
      recommendations.push(
        `🎯 **Meilleur coût d'acquisition** : "${lowestCacChannel.name}" acquiert des clients à seulement ${lowestCacChannel.cac} FCFA par client. Envisagez de lui allouer une part supplémentaire de vos budgets test.`
      );
    }

    recommendations.push(
      `💡 **Règle de prudence COMMERCIA** : Un ROAS élevé ne garantit pas la rentabilité si la marge sur produit est faible. Validez toujours que votre CAC reste inférieur à la marge brute unitaire avant d'augmenter vos budgets.`
    );

    res.json({
      periodLabel: label,
      recommendations,
      dataUsed: {
        totalSalesAnalyzed: sales.length,
        totalExpensesAnalyzed: expenses.length,
        activeChannelsCount: channels.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 6. IMPORTATION CSV (DÉPENSES, CAMPAGNES, VENTES)
// =========================================================================

// POST /api/growth/import/campaigns — Import CSV des campagnes et dépenses pub
router.post('/import/campaigns', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { rows, dryRun } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('Le fichier CSV est vide ou ne contient aucune ligne valide.', 400);
    }

    const errors: string[] = [];
    const validRows: any[] = [];
    await ensureDefaultChannels(req.prisma, businessId);
    const channels = await req.prisma.acquisitionChannel.findMany({ where: { businessId } });

    rows.forEach((row: any, idx: number) => {
      const lineNum = idx + 2;
      const name = (row['Nom Campagne'] || row['Campagne'] || row['name'] || '').trim();
      const channelName = (row['Canal'] || row['Plateforme'] || row['channel'] || '').trim();
      const budgetPlanned = parseFloat(row['Budget'] || row['budgetPlanned'] || '0');
      const actualSpend = parseFloat(row['Dépenses'] || row['actualSpend'] || row['Depenses'] || '0');
      const leadsCount = parseInt(row['Prospects'] || row['leads'] || '0', 10);
      const dateStr = (row['Date Début'] || row['Date'] || row['startDate'] || '').trim();

      if (!name) {
        errors.push(`Ligne ${lineNum} : Nom de campagne manquant.`);
        return;
      }

      // Match channel
      let matchedChannel = channels.find((c: any) => c.name.toLowerCase() === channelName.toLowerCase());
      if (!matchedChannel) {
        matchedChannel = channels.find((c: any) => c.name.toLowerCase().includes('facebook') || c.name.toLowerCase().includes('ads')) || channels[0];
      }

      validRows.push({
        businessId,
        channelId: matchedChannel.id,
        name,
        budgetPlanned: isNaN(budgetPlanned) ? 0 : budgetPlanned,
        actualSpend: isNaN(actualSpend) ? 0 : actualSpend,
        leadsCount: isNaN(leadsCount) ? 0 : leadsCount,
        startDate: dateStr && !isNaN(new Date(dateStr).getTime()) ? new Date(dateStr) : new Date(),
        status: 'completed',
        notes: `Importé via CSV (${channelName || 'Meta Ads'})`,
      });
    });

    if (dryRun) {
      return res.json({
        preview: true,
        totalRows: rows.length,
        validCount: validRows.length,
        errorCount: errors.length,
        errors,
        sample: validRows.slice(0, 3),
      });
    }

    let createdCount = 0;
    for (const r of validRows) {
      await req.prisma.acquisitionCampaign.create({ data: r });
      createdCount++;
    }

    res.json({
      success: true,
      importedCount: createdCount,
      errorsCount: errors.length,
      errors,
      message: `${createdCount} campagne(s) importée(s) avec succès !`,
    });
  } catch (error) {
    next(error);
  }
});

export { router as growthRouter };
