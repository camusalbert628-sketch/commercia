import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { SubscriptionAutomationService } from '../subscriptions/subscriptionAutomation';

const router = Router();

// =========================================================================
// 1. CONFIGURATION DES RÈGLES D'ABONNEMENT ET D'EXPIRATION
// =========================================================================
router.get('/rules/subscriptions', async (req: AuthRequest, res: Response, next) => {
  try {
    const config = await SubscriptionAutomationService.getRuleConfig(req.prisma);
    res.json({
      config: {
        ...config,
        reminderDaysArray: JSON.parse(config.reminderDays || '[7, 3, 1, 0]'),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/rules/subscriptions', async (req: AuthRequest, res: Response, next) => {
  try {
    const {
      gracePeriodDays,
      reminderDays,
      restrictFeaturesOnExpiry,
      autoReactivateOnPayment,
      allowEarlyRenewal,
    } = req.body || {};

    const updated = await req.prisma.subscriptionRuleConfig.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        gracePeriodDays: Number(gracePeriodDays) || 3,
        reminderDays: Array.isArray(reminderDays) ? JSON.stringify(reminderDays) : reminderDays || '[7, 3, 1, 0]',
        restrictFeaturesOnExpiry: restrictFeaturesOnExpiry !== undefined ? Boolean(restrictFeaturesOnExpiry) : true,
        autoReactivateOnPayment: autoReactivateOnPayment !== undefined ? Boolean(autoReactivateOnPayment) : true,
        allowEarlyRenewal: allowEarlyRenewal !== undefined ? Boolean(allowEarlyRenewal) : true,
        updatedBy: req.userId,
      },
      update: {
        gracePeriodDays: gracePeriodDays !== undefined ? Number(gracePeriodDays) : undefined,
        reminderDays: reminderDays !== undefined ? (Array.isArray(reminderDays) ? JSON.stringify(reminderDays) : reminderDays) : undefined,
        restrictFeaturesOnExpiry: restrictFeaturesOnExpiry !== undefined ? Boolean(restrictFeaturesOnExpiry) : undefined,
        autoReactivateOnPayment: autoReactivateOnPayment !== undefined ? Boolean(autoReactivateOnPayment) : undefined,
        allowEarlyRenewal: allowEarlyRenewal !== undefined ? Boolean(allowEarlyRenewal) : undefined,
        updatedBy: req.userId,
      },
    });

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'SUBSCRIPTION_RULES_UPDATED',
        entity: 'SubscriptionRuleConfig',
        entityId: 'singleton',
        details: JSON.stringify({ gracePeriodDays, reminderDays, restrictFeaturesOnExpiry, autoReactivateOnPayment }),
      },
    });

    res.json({
      success: true,
      message: 'Règles d’abonnement mises à jour avec succès.',
      config: {
        ...updated,
        reminderDaysArray: JSON.parse(updated.reminderDays),
      },
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 2. DÉCLENCHEMENT DU CYCLE D'AUTOMATISATION DES EXPIRATIONS
// =========================================================================
router.post('/rules/trigger-expiration-check', async (req: AuthRequest, res: Response, next) => {
  try {
    const report = await SubscriptionAutomationService.runExpirationAutomation(req.prisma);

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'AUTOMATION_CYCLE_TRIGGERED_MANUALLY',
        entity: 'SubscriptionAutomation',
        entityId: 'cycle-' + Date.now(),
        details: JSON.stringify(report),
      },
    });

    res.json({
      success: true,
      message: `Cycle d'automatisation terminé : ${report.notificationsSent} rappels envoyés, ${report.gracePeriodApplied} mis en grâce, ${report.autoSuspensions} abonnements suspendus.`,
      report,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 3. CENTRE D'ALERTES ET DE SURVEILLANCE COMMERCIALE
// =========================================================================
router.get('/alerts/commercial', async (req: AuthRequest, res: Response, next) => {
  try {
    const status = (req.query.status as string) || 'all';
    const priority = (req.query.priority as string) || 'all';

    const where: any = {};
    if (status !== 'all') where.status = status;
    if (priority !== 'all') where.priority = priority;

    const alerts = await req.prisma.commercialAlert.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
    });

    const counts = {
      total: alerts.length,
      critical: alerts.filter((a: any) => a.priority === 'critical' && a.status === 'open').length,
      high: alerts.filter((a: any) => a.priority === 'high' && a.status === 'open').length,
      medium: alerts.filter((a: any) => a.priority === 'medium' && a.status === 'open').length,
      open: alerts.filter((a: any) => a.status === 'open').length,
    };

    res.json({ alerts, counts });
  } catch (error) {
    next(error);
  }
});

router.put('/alerts/commercial/:id/resolve', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const updated = await req.prisma.commercialAlert.update({
      where: { id },
      data: {
        status: status || 'resolved',
        resolvedAt: new Date(),
        resolvedBy: req.userId,
      },
    });

    res.json({ success: true, message: 'Alerte mise à jour.', alert: updated });
  } catch (error) {
    next(error);
  }
});

export { router as rulesAlertsAdminRouter };
