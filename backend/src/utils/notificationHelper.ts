import { PrismaClient } from '@prisma/client';

export interface CreateNotificationParams {
  userId: string;
  businessId?: string;
  type: 'stock_low' | 'debt_reminder' | 'cash_discrepancy' | 'lot_breakeven' | 'team_member' | 'sales_up' | 'report_ready';
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
}

/**
 * Crée une notification in-app pour l'utilisateur avec déduplication intelligente
 * (évite de spammer 10 fois pour le même produit dans la même journée).
 */
export async function createNotification(
  prisma: any,
  params: CreateNotificationParams
) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Déduplication journalière pour stock_low et debt_reminder
    if (params.type === 'stock_low' || params.type === 'debt_reminder') {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          createdAt: { gte: today },
        },
      });
      if (existing) {
        return existing;
      }
    }

    return await prisma.notification.create({
      data: {
        userId: params.userId,
        businessId: params.businessId || null,
        type: params.type,
        title: params.title,
        message: params.message,
        icon: params.icon || '🔔',
        actionUrl: params.actionUrl || null,
      },
    });
  } catch (error) {
    console.error('Erreur création notification:', error);
    return null;
  }
}

/**
 * Analyse automatiquement l'entreprise pour générer en direct les alertes prioritaires
 * (Stocks faibles, créances élevées en souffrance, écarts de caisse récents)
 */
export async function syncBusinessAlerts(prisma: any, userId: string, businessId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Alertes Ruptures de Stock
    const lowStockProducts = await prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
        quantity: { lte: prisma.product.fields?.lowStockAlert || 5 },
      },
      take: 5,
    });

    for (const prod of lowStockProducts) {
      if (prod.quantity <= (prod.lowStockAlert ?? 5)) {
        await createNotification(prisma, {
          userId,
          businessId,
          type: 'stock_low',
          title: `Alerte Stock : ${prod.name}`,
          message: prod.quantity <= 0
            ? `Le produit « ${prod.name} » est EN RUPTURE TOTALE (0 pièce). Commandez auprès de votre fournisseur !`
            : `Stock critique pour « ${prod.name} » : plus que ${prod.quantity} pièce(s) restante(s).`,
          icon: prod.quantity <= 0 ? '🚨' : '📦',
          actionUrl: '/products',
        });
      }
    }

    // 2. Alertes Dettes Clients importantes
    const highDebtors = await prisma.customer.findMany({
      where: {
        businessId,
        totalOwed: { gt: 10000 },
      },
      orderBy: { totalOwed: 'desc' },
      take: 3,
    });

    for (const deb of highDebtors) {
      await createNotification(prisma, {
        userId,
        businessId,
        type: 'debt_reminder',
        title: `Relance Crédit : ${deb.name}`,
        message: `Le client ${deb.name} a une ardoise en cours de ${deb.totalOwed.toLocaleString('fr-FR')} FCFA. Envoyez un rappel WhatsApp !`,
        icon: '⏳',
        actionUrl: '/customers',
      });
    }
  } catch (err) {
    console.error('Erreur synchronisation des alertes:', err);
  }
}
