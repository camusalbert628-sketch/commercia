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

// =========================================================================
// 3. MOTEUR DE CALCULS FINANCIERS & ANALYSE DE LA RENTABILITÉ
// =========================================================================

// GET /api/growth/analytics — Calcul complet et transparent selon la période
router.get('/analytics', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    await ensureDefaultChannels(req.prisma, businessId);

    const { period, startDate, endDate, channelId, attributionModel = 'first_touch' } = req.query as any;
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

    // 3. Ventes remboursées et annulées sur la période
    const refundedSales = await req.prisma.sale.findMany({
      where: {
        businessId,
        saleDate: { gte: start, lte: end },
        status: 'refunded',
      },
      include: { items: true, channel: true },
    });

    const cancelledSales = await req.prisma.sale.findMany({
      where: {
        businessId,
        saleDate: { gte: start, lte: end },
        status: 'cancelled',
      },
      include: { items: true, channel: true },
    });

    const pendingSales = await req.prisma.sale.findMany({
      where: {
        businessId,
        saleDate: { gte: start, lte: end },
        status: 'pending',
      },
      include: { items: true, channel: true },
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

    // 5. Charges fixes d'exploitation sur la période (loyer, salaires, etc.)
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
    const customerFirstChannelMap = new Map<string, string>(); // customerId -> first historical channelId

    for (const item of clientFirstSales) {
      if (item.firstSale) {
        const fDate = new Date(item.firstSale.saleDate);
        if (fDate >= start && fDate <= end) {
          newCustomerIds.add(item.customerId);
          if (item.firstSale.channelId) {
            customerFirstChannelMap.set(item.customerId, item.firstSale.channelId);
          }
        }
      }
    }

    // Calcul par canal d'acquisition
    const channelStats = channels.map((channel: any) => {
      // Ventes attribuées à ce canal
      const channelSales = sales.filter((s: any) => s.channelId === channel.id);
      const channelRefunds = refundedSales.filter((s: any) => s.channelId === channel.id);
      const channelCancelled = cancelledSales.filter((s: any) => s.channelId === channel.id);

      // Chiffre d'affaires net = Somme des ventes admissibles nettes de remises - remboursements
      const grossRevenue = channelSales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
      const refundedRevenue = channelRefunds.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
      const cancelledRevenue = channelCancelled.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
      const netRevenue = Math.max(0, grossRevenue - refundedRevenue);

      // Encaissements réels (montants payés encaissés)
      const collectedRevenue = channelSales.reduce((sum: number, s: any) => sum + (s.paidAmount || 0), 0);

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

      // Dépenses d'acquisition attribuées au canal
      const directExpenses = acquisitionExpenses
        .filter((e: any) => e.channelId === channel.id)
        .reduce((sum: number, e: any) => sum + e.amount, 0);

      const adExpenses = acquisitionExpenses
        .filter((e: any) => e.channelId === channel.id && e.category === 'publicite')
        .reduce((sum: number, e: any) => sum + e.amount, 0);

      const channelCampaigns = campaigns.filter((c: any) => c.channelId === channel.id);
      const campaignActualSpend = channelCampaigns.reduce((sum: number, c: any) => sum + (c.actualSpend || 0), 0);
      const leadsCount = channelCampaigns.reduce((sum: number, c: any) => sum + (c.leadsCount || 0), 0);

      // Prévention des doubles comptabilisations entre campagnes et dépenses directes
      const adSpend = Math.max(adExpenses, campaignActualSpend);
      const otherAcquisitionSpend = Math.max(0, directExpenses - adExpenses);
      const acquisitionSpend = Math.max(directExpenses, adSpend + otherAcquisitionSpend);

      // Nouveaux clients acquis selon la règle d'attribution choisie
      let newClientsForChannel = 0;
      if (attributionModel === 'last_touch') {
        // Dernier contact : clients uniques dont la vente présente est sur ce canal
        const uniqueCustomerIdsInChan = new Set(channelSales.filter((s: any) => s.customerId).map((s: any) => s.customerId));
        newClientsForChannel = Array.from(newCustomerIds).filter(cid => uniqueCustomerIdsInChan.has(cid)).length;
      } else {
        // Premier contact (standard CAC) : premier canal historique qui a converti le client
        newClientsForChannel = Array.from(newCustomerIds).filter(cid => {
          const cChanId = customerFirstChannelMap.get(cid);
          if (cChanId) return cChanId === channel.id;
          return channelSales.some((s: any) => s.customerId === cid);
        }).length;
      }

      // Clients existants (commandes répétées de clients déjà acquis avant la période)
      const ordersCount = channelSales.length;
      const existingClientsOrders = channelSales.filter((s: any) => s.customerId && !newCustomerIds.has(s.customerId)).length;

      // CALCULS FINANCIERS OBLIGATOIRES
      // A. CAC (Coût d'Acquisition Client)
      // CAC = Dépenses d'acquisition attribuables / Nouveaux clients acquis
      const totalCac = newClientsForChannel > 0
        ? Number((acquisitionSpend / newClientsForChannel).toFixed(2))
        : null; // Non calculable si 0 client

      const adCac = newClientsForChannel > 0 && adSpend > 0
        ? Number((adSpend / newClientsForChannel).toFixed(2))
        : null;

      const cac = totalCac;

      // B. Bénéfice après acquisition
      // Bénéfice = CA Net - Coût des marchandises - Charges variables - Dépenses acquisition
      const profitAfterAcquisition = netRevenue - cogs - totalVariableCosts - acquisitionSpend;

      // Bénéfice par article
      const profitPerItem = itemsSold > 0
        ? Number((profitAfterAcquisition / itemsSold).toFixed(2))
        : 0;

      // C. ROAS (Return On Ad Spend)
      // ROAS = CA attribué / Dépenses pub
      const roas = adSpend > 0
        ? Number(((netRevenue / adSpend) * 100).toFixed(1))
        : null; // Non calculable si 0 dépense pub

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
        adSpend,
        otherAcquisitionSpend,
        acquisitionSpend,
        leadsCount,
        newCustomersCount: newClientsForChannel,
        ordersCount,
        existingClientsOrders,
        cancelledOrdersCount: channelCancelled.length,
        refundedOrdersCount: channelRefunds.length,
        itemsSold,
        grossRevenue,
        refundedRevenue,
        cancelledRevenue,
        netRevenue,
        collectedRevenue,
        cogs,
        variableCosts: totalVariableCosts,
        profitAfterAcquisition,
        profitPerItem,
        cac,
        adCac,
        totalCac,
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
    const totalAdSpend = channelStats.reduce((sum: number, c: any) => sum + c.adSpend, 0);
    const totalLeads = channelStats.reduce((sum: number, c: any) => sum + c.leadsCount, 0);
    const totalNewCustomers = newCustomerIds.size;
    const totalOrders = channelStats.reduce((sum: number, c: any) => sum + c.ordersCount, 0);
    const totalCancelledOrders = channelStats.reduce((sum: number, c: any) => sum + c.cancelledOrdersCount, 0);
    const totalRefundedOrders = channelStats.reduce((sum: number, c: any) => sum + c.refundedOrdersCount, 0);
    const totalItemsSold = channelStats.reduce((sum: number, c: any) => sum + c.itemsSold, 0);
    const totalGrossRevenue = channelStats.reduce((sum: number, c: any) => sum + c.grossRevenue, 0);
    const totalRefundedRevenue = channelStats.reduce((sum: number, c: any) => sum + c.refundedRevenue, 0);
    const totalCancelledRevenue = channelStats.reduce((sum: number, c: any) => sum + c.cancelledRevenue, 0);
    const totalNetRevenue = channelStats.reduce((sum: number, c: any) => sum + c.netRevenue, 0);
    const totalCollectedRevenue = channelStats.reduce((sum: number, c: any) => sum + c.collectedRevenue, 0);
    const totalCogs = channelStats.reduce((sum: number, c: any) => sum + c.cogs, 0);
    const totalVariableCosts = channelStats.reduce((sum: number, c: any) => sum + c.variableCosts, 0);
    const totalProfitAfterAcquisition = totalNetRevenue - totalCogs - totalVariableCosts - totalAcquisitionSpend;

    // CAC Moyen Global
    const globalCac = totalNewCustomers > 0
      ? Number((totalAcquisitionSpend / totalNewCustomers).toFixed(2))
      : null;

    const globalAdCac = totalNewCustomers > 0 && totalAdSpend > 0
      ? Number((totalAdSpend / totalNewCustomers).toFixed(2))
      : null;

    // ROAS Global
    const globalRoas = totalAdSpend > 0
      ? Number(((totalNetRevenue / totalAdSpend) * 100).toFixed(1))
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

    // Explications d'aide pédagogique si données insuffisantes
    let breakEvenExplanation = 'Calculé sur la base de la marge contributive, des charges fixes et des dépenses d\'acquisition de la période.';
    if (totalItemsSold === 0) {
      breakEvenExplanation = 'Aucune vente enregistrée sur cette période pour déterminer le prix moyen et le coût variable unitaire. Saisissez au moins une vente.';
    } else if (tmcv <= 0) {
      breakEvenExplanation = 'La marge contributive est nulle ou négative (vos coûts variables dépassent votre prix de vente). Augmentez votre prix ou réduisez vos coûts variables.';
    }

    res.json({
      period: {
        key: period || 'current_month',
        label,
        start: start.toISOString(),
        end: end.toISOString(),
        attributionModel,
      },
      summary: {
        totalAcquisitionSpend,
        totalAdSpend,
        totalLeads,
        totalNewCustomers,
        totalOrders,
        totalCancelledOrders,
        totalRefundedOrders,
        totalItemsSold,
        totalGrossRevenue,
        totalRefundedRevenue,
        totalCancelledRevenue,
        totalNetRevenue,
        totalCollectedRevenue,
        totalCogs,
        totalVariableCosts,
        totalProfitAfterAcquisition,
        totalFixedCosts,
        netOperatingProfit,
        globalCac,
        globalAdCac,
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
        explanation: breakEvenExplanation,
      },
      channels: channelStats,
      bestChannel: channelStats[0] || null,
      sourceDataCounts: {
        admissibleSalesCount: sales.length,
        refundedSalesCount: refundedSales.length,
        cancelledSalesCount: cancelledSales.length,
        pendingSalesCount: pendingSales.length,
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
    const { period, startDate, endDate } = req.query as any;
    const { start, end } = getPeriodDateRange(period, startDate, endDate);

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

      // Ventes réelles filtrées selon la période sélectionnée
      const relevantSaleItems = p.saleItems.filter((si: any) => {
        if (!si.sale) return false;
        if (!['completed', 'paid', 'delivered'].includes(si.sale.status)) return false;
        const sDate = new Date(si.sale.saleDate);
        return sDate >= start && sDate <= end;
      });

      const totalUnitsSold = relevantSaleItems.reduce((sum: number, si: any) => sum + (si.quantity || 1), 0);
      const totalRevenue = relevantSaleItems.reduce((sum: number, si: any) => sum + (si.totalPrice || (si.quantity * sellingPrice)), 0);
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
        variableBreakdown: {
          transport: variableBreakdown.transport || 0,
          packaging: variableBreakdown.packaging || 0,
          delivery: variableBreakdown.delivery || 0,
          fees: variableBreakdown.fees || 0,
          commission: variableBreakdown.commission || 0,
          internet: variableBreakdown.internet || 0,
          other: variableBreakdown.other || 0,
        },
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

// POST /api/growth/products — Créer ou modifier un produit/service avec décomposition des charges variables
router.post('/products', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const schema = z.object({
      id: z.string().optional(),
      name: z.string().min(1, 'Nom du produit ou service requis'),
      reference: z.string().optional(),
      category: z.string().optional(),
      sellingPrice: z.number().min(0),
      costPrice: z.number().min(0).default(0),
      quantity: z.number().int().min(0).default(0),
      variableBreakdown: z.object({
        transport: z.number().min(0).default(0),
        packaging: z.number().min(0).default(0),
        delivery: z.number().min(0).default(0),
        fees: z.number().min(0).default(0),
        commission: z.number().min(0).default(0),
        internet: z.number().min(0).default(0),
        other: z.number().min(0).default(0),
      }).default({}),
    });
    const data = schema.parse(req.body);

    const b = data.variableBreakdown;
    const totalVariableCosts = b.transport + b.packaging + b.delivery + b.fees + b.commission + b.internet + b.other;

    if (data.id) {
      // Update
      const existing = await req.prisma.product.findFirst({ where: { id: data.id, businessId } });
      if (!existing) throw new AppError('Produit introuvable.', 404);

      const updated = await req.prisma.product.update({
        where: { id: data.id },
        data: {
          name: data.name,
          reference: data.reference || null,
          category: data.category || null,
          sellingPrice: data.sellingPrice,
          costPrice: data.costPrice,
          variableCosts: totalVariableCosts,
          variableCostsBreakdown: JSON.stringify(data.variableBreakdown),
          quantity: data.quantity,
        },
      });
      return res.json(updated);
    }

    // Create
    const created = await req.prisma.product.create({
      data: {
        businessId,
        name: data.name,
        reference: data.reference || null,
        category: data.category || 'Général',
        sellingPrice: data.sellingPrice,
        costPrice: data.costPrice,
        variableCosts: totalVariableCosts,
        variableCostsBreakdown: JSON.stringify(data.variableBreakdown),
        quantity: data.quantity,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// =========================================================================
// 5. SAISIE DES VENTES & COMMANDES DANS LE MODULE CROISSANCE (SECTION 5)
// =========================================================================

// GET /api/growth/sales — Liste des ventes avec filtres de date et de canal
router.get('/sales', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { period, startDate, endDate, channelId, status } = req.query as any;
    const { start, end } = getPeriodDateRange(period, startDate, endDate);

    const where: any = {
      businessId,
      saleDate: { gte: start, lte: end },
    };
    if (channelId) where.channelId = channelId;
    if (status) where.status = status;

    const sales = await req.prisma.sale.findMany({
      where,
      orderBy: { saleDate: 'desc' },
      include: {
        customer: true,
        channel: true,
        campaign: true,
        items: true,
      },
    });

    res.json(sales);
  } catch (error) {
    next(error);
  }
});

// POST /api/growth/sales — Enregistrer une vente avec attribution et charges
router.post('/sales', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const schema = z.object({
      saleDate: z.string().optional(),
      productId: z.string().optional(),
      productName: z.string().min(1, 'Nom du produit ou service requis'),
      quantity: z.number().int().min(1).default(1),
      unitPrice: z.number().min(0),
      discountAmount: z.number().min(0).default(0),
      paidAmount: z.number().min(0).optional(),
      paymentMethod: z.enum(['cash', 'mobile_money', 'bank_transfer', 'credit']).default('cash'),
      status: z.enum(['completed', 'paid', 'delivered', 'pending', 'cancelled', 'refunded']).default('completed'),
      channelId: z.string().optional(),
      campaignId: z.string().optional(),
      customerId: z.string().optional(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      orderVariableCosts: z.number().min(0).default(0), // charges spécifiques commande (livraison etc)
      notes: z.string().optional(),
    });
    const data = schema.parse(req.body);

    // Résoudre le client
    let customerId = data.customerId;
    if (!customerId && (data.customerName || data.customerPhone)) {
      let cust = await req.prisma.customer.findFirst({
        where: {
          businessId,
          OR: [
            ...(data.customerPhone ? [{ phone: data.customerPhone }] : []),
            ...(data.customerName ? [{ name: data.customerName }] : []),
          ],
        },
      });
      if (!cust && data.customerName) {
        cust = await req.prisma.customer.create({
          data: {
            businessId,
            name: data.customerName,
            phone: data.customerPhone || null,
            firstChannelId: data.channelId || null,
            acquiredAt: data.saleDate ? new Date(data.saleDate) : new Date(),
          },
        });
      }
      if (cust) customerId = cust.id;
    }

    // Récupérer les coûts unitaire produit si rattaché
    let costPrice = 0;
    let unitVariableCosts = 0;
    if (data.productId) {
      const prod = await req.prisma.product.findUnique({
        where: { id: data.productId },
        select: { costPrice: true, variableCosts: true },
      });
      if (prod) {
        costPrice = prod.costPrice;
        unitVariableCosts = prod.variableCosts;
      }
    }

    const lineTotal = data.unitPrice * data.quantity;
    const computedTotal = Math.max(0, lineTotal - data.discountAmount);
    const paidAmount = data.paidAmount !== undefined
      ? data.paidAmount
      : (data.paymentMethod === 'credit' ? 0 : computedTotal);

    // Créer la vente
    const sale = await req.prisma.sale.create({
      data: {
        businessId,
        customerId: customerId || null,
        channelId: data.channelId || null,
        campaignId: data.campaignId || null,
        totalAmount: computedTotal,
        paidAmount,
        discountAmount: data.discountAmount,
        variableCosts: data.orderVariableCosts,
        paymentMethod: data.paymentMethod,
        status: data.status,
        saleDate: data.saleDate ? new Date(data.saleDate) : new Date(),
        notes: data.notes || null,
        items: {
          create: [
            {
              productId: data.productId || null,
              name: data.productName,
              quantity: data.quantity,
              unitPrice: data.unitPrice,
              costPrice,
              variableCosts: unitVariableCosts,
              totalPrice: lineTotal,
            },
          ],
        },
      },
      include: { items: true, customer: true, channel: true },
    });

    res.status(201).json(sale);
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// =========================================================================
// 6. SIMULATION D'OBJECTIF DE BÉNÉFICE (SECTION 10)
// =========================================================================

router.post('/target-simulation', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { targetProfit = 500000, fixedCostsOverride, targetPeriod = 'current_month' } = req.body;

    const { start, end } = getPeriodDateRange(targetPeriod);

    // Calculer les données moyennes actuelles
    const sales = await req.prisma.sale.findMany({
      where: {
        businessId,
        saleDate: { gte: start, lte: end },
        status: { in: ['completed', 'paid', 'delivered'] },
      },
      include: { items: true },
    });

    const fixedExpenses = await req.prisma.expense.findMany({
      where: {
        businessId,
        expenseDate: { gte: start, lte: end },
        isFixedCost: true,
      },
    });

    const currentFixedCosts = fixedCostsOverride !== undefined
      ? Number(fixedCostsOverride)
      : fixedExpenses.reduce((s: number, e: any) => s + e.amount, 0);

    const totalRevenue = sales.reduce((s: number, sale: any) => s + sale.totalAmount, 0);
    const totalUnits = sales.reduce((s: number, sale: any) => s + sale.items.reduce((is: number, i: any) => is + i.quantity, 0), 0);
    const totalCogs = sales.reduce((s: number, sale: any) => s + sale.items.reduce((is: number, i: any) => is + (i.costPrice * i.quantity), 0), 0);
    const totalVar = sales.reduce((s: number, sale: any) => s + sale.items.reduce((is: number, i: any) => is + (i.variableCosts * i.quantity), 0) + (sale.variableCosts || 0), 0);

    const avgPrice = totalUnits > 0 ? totalRevenue / totalUnits : 10000;
    const avgCost = totalUnits > 0 ? (totalCogs + totalVar) / totalUnits : 4000;
    const unitMargin = Math.max(1, avgPrice - avgCost);
    const tmcv = unitMargin / avgPrice;

    // Pour dégager targetProfit : Marge contributive totale nécessaire = Charges fixes + targetProfit
    const requiredMargin = currentFixedCosts + targetProfit;
    const requiredUnits = Math.ceil(requiredMargin / unitMargin);
    const requiredRevenue = Math.round(requiredMargin / tmcv);

    // Budget pub maximal tolérable si on veut préserver ce bénéfice
    const maxSafeAdBudget = Math.max(0, Math.round(totalRevenue - totalCogs - totalVar - currentFixedCosts - targetProfit));

    res.json({
      targetProfit,
      currentFixedCosts,
      avgPrice: Math.round(avgPrice),
      avgCost: Math.round(avgCost),
      unitMargin: Math.round(unitMargin),
      tmcv: Number((tmcv * 100).toFixed(1)),
      requiredUnits,
      requiredRevenue,
      maxSafeAdBudget,
      explanation: `Pour atteindre ${targetProfit.toLocaleString('fr-FR')} FCFA de bénéfice net, vous devez vendre au moins ${requiredUnits.toLocaleString('fr-FR')} unités (soit un CA d'environ ${requiredRevenue.toLocaleString('fr-FR')} FCFA), en maintenant votre marge unitaire à ${Math.round(unitMargin).toLocaleString('fr-FR')} FCFA.`,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 7. CHARGER LE SCÉNARIO OFFICIEL DE RÉFÉRENCE (SECTION 7 DU CAHIER DES CHARGES)
// =========================================================================

router.post('/load-reference-scenario', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);

    // S'assurer que Facebook Ads existe
    let fbChan = await req.prisma.acquisitionChannel.findFirst({
      where: { businessId, name: 'Facebook Ads' },
    });
    if (!fbChan) {
      fbChan = await req.prisma.acquisitionChannel.create({
        data: {
          businessId,
          name: 'Facebook Ads',
          type: 'paid_social',
          color: '#1877F2',
          icon: 'Facebook',
        },
      });
    }

    // Créer la campagne de référence
    const refCampaignName = 'Campagne Référence Section 7 (Meta Ads)';
    let camp = await req.prisma.acquisitionCampaign.findFirst({
      where: { businessId, channelId: fbChan.id, name: refCampaignName },
    });
    if (!camp) {
      camp = await req.prisma.acquisitionCampaign.create({
        data: {
          businessId,
          channelId: fbChan.id,
          name: refCampaignName,
          budgetPlanned: 30000,
          actualSpend: 30000,
          leadsCount: 140,
          status: 'completed',
        },
      });
    } else {
      await req.prisma.acquisitionCampaign.update({
        where: { id: camp.id },
        data: { actualSpend: 30000, budgetPlanned: 30000 },
      });
    }

    // Créer la dépense pub correspondante
    const existingExp = await req.prisma.expense.findFirst({
      where: { businessId, campaignId: camp.id, category: 'publicite' },
    });
    if (!existingExp) {
      await req.prisma.expense.create({
        data: {
          businessId,
          channelId: fbChan.id,
          campaignId: camp.id,
          amount: 30000,
          category: 'publicite',
          description: 'Dépenses pub officielles - Section 7',
          isAcquisition: true,
        },
      });
    }

    // Créer le produit de référence
    const refProdName = 'Article Référence Section 7';
    let prod = await req.prisma.product.findFirst({
      where: { businessId, name: refProdName },
    });
    if (!prod) {
      prod = await req.prisma.product.create({
        data: {
          businessId,
          name: refProdName,
          sellingPrice: 8000,
          costPrice: 3000,
          variableCosts: 500,
          variableCostsBreakdown: JSON.stringify({ transport: 500 }),
          quantity: 200,
        },
      });
    }

    // Créer 70 nouveaux clients et leurs 70 ventes
    const existingSalesCount = await req.prisma.sale.count({
      where: { businessId, campaignId: camp.id },
    });

    if (existingSalesCount < 70) {
      const needed = 70 - existingSalesCount;
      for (let i = 1; i <= needed; i++) {
        const custNum = existingSalesCount + i;
        const customer = await req.prisma.customer.create({
          data: {
            businessId,
            name: `Client Référence #${custNum}`,
            phone: `+237 670 00${custNum.toString().padStart(4, '0')}`,
            firstChannelId: fbChan.id,
            totalBought: 8000,
          },
        });

        await req.prisma.sale.create({
          data: {
            businessId,
            customerId: customer.id,
            channelId: fbChan.id,
            campaignId: camp.id,
            totalAmount: 8000,
            paidAmount: 8000,
            variableCosts: 0,
            paymentMethod: 'cash',
            status: 'completed',
            notes: `Vente de référence Section 7 - Commande 1 article à 8 000 FCFA`,
            items: {
              create: [
                {
                  productId: prod.id,
                  name: prod.name,
                  quantity: 1,
                  unitPrice: 8000,
                  costPrice: 3000,
                  variableCosts: 500,
                  totalPrice: 8000,
                },
              ],
            },
          },
        });
      }
    }

    res.json({
      success: true,
      message: 'Scénario officiel Section 7 chargé avec succès (70 clients, 30 000 FCFA pub, 560 000 FCFA CA) !',
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 8. COPILOTE IA STRATÉGIQUE (ANALYSE BASÉE SUR LES DONNÉES RÉELLES)
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
        `🏆 **Canal le plus rentable** : "${top.name}" a généré le bénéfice net le plus élevé (${(top.profit - top.spend).toLocaleString('fr-FR')} FCFA après déduction des coûts marchandises, charges variables et pub). C'est votre levier de croissance prioritaire.`
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
// 9. IMPORTATION CSV (CAMPAGNES, DÉPENSES & VENTES)
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

// POST /api/growth/import/sales — Import CSV des ventes et commandes
router.post('/import/sales', async (req: AuthRequest, res: Response, next: NextFunction) => {
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
      const productName = (row['Produit'] || row['Article'] || row['productName'] || '').trim();
      const channelName = (row['Canal'] || row['channel'] || '').trim();
      const customerName = (row['Client'] || row['customerName'] || '').trim();
      const customerPhone = (row['Téléphone'] || row['Telephone'] || row['phone'] || '').trim();
      const quantity = parseInt(row['Quantité'] || row['Quantite'] || row['quantity'] || '1', 10);
      const unitPrice = parseFloat(row['Prix Unitaire'] || row['unitPrice'] || '0');
      const discount = parseFloat(row['Remise'] || row['discount'] || '0');
      const status = (row['Statut'] || row['status'] || 'completed').toLowerCase().trim();
      const dateStr = (row['Date'] || row['saleDate'] || '').trim();

      if (!productName) {
        errors.push(`Ligne ${lineNum} : Nom de produit ou service manquant.`);
        return;
      }
      if (isNaN(unitPrice) || unitPrice < 0) {
        errors.push(`Ligne ${lineNum} : Prix unitaire invalide.`);
        return;
      }

      // Match channel
      let matchedChan = channels.find((c: any) => c.name.toLowerCase() === channelName.toLowerCase());
      if (!matchedChan) matchedChan = channels[0];

      validRows.push({
        productName,
        channelId: matchedChan.id,
        channelName: matchedChan.name,
        customerName: customerName || `Client CSV Ligne ${lineNum}`,
        customerPhone,
        quantity: isNaN(quantity) || quantity <= 0 ? 1 : quantity,
        unitPrice,
        discount: isNaN(discount) ? 0 : discount,
        status: ['completed', 'paid', 'delivered', 'pending', 'cancelled', 'refunded'].includes(status) ? status : 'completed',
        saleDate: dateStr && !isNaN(new Date(dateStr).getTime()) ? new Date(dateStr) : new Date(),
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
      // Create or find customer
      let cust = await req.prisma.customer.findFirst({
        where: { businessId, name: r.customerName },
      });
      if (!cust) {
        cust = await req.prisma.customer.create({
          data: {
            businessId,
            name: r.customerName,
            phone: r.customerPhone || null,
            firstChannelId: r.channelId,
          },
        });
      }

      const total = Math.max(0, (r.unitPrice * r.quantity) - r.discount);
      await req.prisma.sale.create({
        data: {
          businessId,
          customerId: cust.id,
          channelId: r.channelId,
          totalAmount: total,
          paidAmount: r.status === 'completed' || r.status === 'paid' ? total : 0,
          discountAmount: r.discount,
          status: r.status,
          saleDate: r.saleDate,
          notes: `Importé via CSV (${r.channelName})`,
          items: {
            create: [
              {
                name: r.productName,
                quantity: r.quantity,
                unitPrice: r.unitPrice,
                costPrice: 0,
                variableCosts: 0,
                totalPrice: r.unitPrice * r.quantity,
              },
            ],
          },
        },
      });
      createdCount++;
    }

    res.json({
      success: true,
      importedCount: createdCount,
      errorsCount: errors.length,
      errors,
      message: `${createdCount} vente(s) importée(s) avec succès !`,
    });
  } catch (error) {
    next(error);
  }
});

export { router as growthRouter };
