import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// =========================================================================
// 1. LISTE GÉNÉRALE DES RETOURS & FEEDBACKS MARCHANDS
// =========================================================================
router.get('/feedbacks', async (req: AuthRequest, res: Response, next) => {
  try {
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const status = (req.query.status as string) || 'all';
    const category = (req.query.category as string) || 'all';
    const priority = req.query.priority === 'true';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const where: any = {};

    if (status !== 'all') {
      where.status = status;
    }

    if (category !== 'all') {
      where.category = category;
    }

    if (priority) {
      where.isPriority = true;
    }

    if (search) {
      where.OR = [
        { comment: { contains: search, mode: 'insensitive' } },
        { module: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [feedbacks, total] = await Promise.all([
      req.prisma.userFeedback.findMany({
        where,
        orderBy: [{ isPriority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              businesses: {
                take: 1,
                include: { business: { select: { id: true, name: true, sector: true } } },
              },
            },
          },
        },
      }),
      req.prisma.userFeedback.count({ where }),
    ]);

    const formatted = feedbacks.map((f: any) => {
      const u = f.user;
      const biz = u?.businesses[0]?.business;
      return {
        id: f.id,
        userId: f.userId,
        userName: f.userName || (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Anonyme'),
        userEmail: f.userEmail || u?.email || 'Non renseigné',
        userPhone: f.userPhone || u?.phone || 'Non renseigné',
        businessName: f.businessName || biz?.name || 'Non renseignée',
        sector: biz?.sector || 'commerce',
        rating: f.rating,
        category: f.category,
        categoryLabel: f.categoryLabel,
        comment: f.comment,
        module: f.module || 'général',
        satisfactionTags: f.satisfactionTags ? JSON.parse(f.satisfactionTags) : [],
        status: f.status,
        isPriority: f.isPriority,
        internalNotes: f.internalNotes,
        assignedTo: f.assignedTo,
        responseMessage: f.responseMessage,
        respondedAt: f.respondedAt ? f.respondedAt.toISOString() : null,
        respondedBy: f.respondedBy,
        resolvedAt: f.resolvedAt ? f.resolvedAt.toISOString() : null,
        createdAt: f.createdAt.toISOString(),
      };
    });

    res.json({
      feedbacks: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 2. ANALYTIQUE DES FEEDBACKS & STATISTIQUES DES NOTATIONS
// =========================================================================
router.get('/feedbacks/analytics', async (req: AuthRequest, res: Response, next) => {
  try {
    const all = await req.prisma.userFeedback.findMany();

    const total = all.length;
    let sumRating = 0;
    let suggestionsCount = 0;
    let bugsCount = 0;
    let complaintsCount = 0;
    let unresolvedCount = 0;
    let resolvedCount = 0;

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const moduleCriticismMap: Record<string, { count: number; negativeCount: number }> = {};

    for (const f of all) {
      const r = Math.max(1, Math.min(5, f.rating));
      sumRating += r;
      ratingDistribution[r] = (ratingDistribution[r] || 0) + 1;

      if (f.category === 'suggestion' || f.category === 'amelioration' || f.category === 'demande_fonctionnalite') {
        suggestionsCount++;
      } else if (f.category === 'bug' || f.category === 'probleme_technique') {
        bugsCount++;
      } else if (f.category === 'reclamation' || f.category === 'difficulte') {
        complaintsCount++;
      }

      if (f.status === 'new' || f.status === 'in_progress') {
        unresolvedCount++;
      } else if (f.status === 'resolved') {
        resolvedCount++;
      }

      const mod = f.module || 'général';
      if (!moduleCriticismMap[mod]) {
        moduleCriticismMap[mod] = { count: 0, negativeCount: 0 };
      }
      moduleCriticismMap[mod].count++;
      if (r <= 2 || f.category === 'bug' || f.category === 'reclamation') {
        moduleCriticismMap[mod].negativeCount++;
      }
    }

    const averageRating = total > 0 ? Math.round((sumRating / total) * 10) / 10 : 5.0;

    // Classement des modules les plus critiqués
    const topCriticizedModules = Object.entries(moduleCriticismMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.negativeCount - a.negativeCount || b.count - a.count)
      .slice(0, 8);

    res.json({
      total,
      averageRating,
      suggestionsCount,
      bugsCount,
      complaintsCount,
      unresolvedCount,
      resolvedCount,
      ratingDistribution,
      topCriticizedModules,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 3. MISE À JOUR DU STATUT D'UN RETOUR (PRIORITÉ, NOTES, ASSIGNATION)
// =========================================================================
router.put('/feedbacks/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { status, isPriority, internalNotes, assignedTo } = req.body || {};

    const updated = await req.prisma.userFeedback.update({
      where: { id },
      data: {
        status: status !== undefined ? status : undefined,
        isPriority: isPriority !== undefined ? Boolean(isPriority) : undefined,
        internalNotes: internalNotes !== undefined ? internalNotes : undefined,
        assignedTo: assignedTo !== undefined ? assignedTo : undefined,
        resolvedAt: status === 'resolved' ? new Date() : undefined,
        resolvedBy: status === 'resolved' ? req.userId : undefined,
      },
    });

    res.json({ success: true, message: 'Retour mis à jour.', feedback: updated });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 4. RÉPONSE DIRECTE DU SUPER ADMIN À L'UTILISATEUR
// =========================================================================
router.post('/feedbacks/:id/respond', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { message, markResolved } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new AppError('Le message de réponse ne peut pas être vide.', 400);
    }

    const feedback = await req.prisma.userFeedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      throw new AppError('Retour utilisateur introuvable.', 404);
    }

    const now = new Date();

    // Mise à jour de l'enregistrement de feedback
    const updatedFeedback = await req.prisma.userFeedback.update({
      where: { id },
      data: {
        responseMessage: message.trim(),
        respondedAt: now,
        respondedBy: req.userId!,
        status: markResolved ? 'resolved' : 'in_progress',
        resolvedAt: markResolved ? now : feedback.resolvedAt,
        resolvedBy: markResolved ? req.userId! : feedback.resolvedBy,
      },
    });

    // Si l'utilisateur est identifié, lui envoyer une notification directe dans son dashboard
    if (feedback.userId) {
      await req.prisma.notification.create({
        data: {
          userId: feedback.userId,
          type: 'support_reply',
          title: 'Réponse de l’équipe COMMERCIA à votre suggestion',
          message: message.trim(),
        },
      });

      // Enregistrement dans l'historique de communication
      await req.prisma.communicationMessage.create({
        data: {
          type: 'individual',
          recipientId: feedback.userId,
          channel: 'internal_notification',
          title: `Réponse au retour #${feedback.id.slice(0, 8)}`,
          content: message.trim(),
          status: 'delivered',
          sentBy: req.userId!,
          recipientCount: 1,
          successCount: 1,
          failureCount: 0,
        },
      });
    }

    // Journal d'audit
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'FEEDBACK_RESPONDED',
        entity: 'UserFeedback',
        entityId: feedback.id,
        details: JSON.stringify({
          feedbackId: feedback.id,
          recipientUserId: feedback.userId,
          markResolved: !!markResolved,
        }),
      },
    });

    res.json({
      success: true,
      message: 'Réponse transmise avec succès au commerçant !',
      feedback: updatedFeedback,
    });
  } catch (error) {
    next(error);
  }
});

export { router as feedbacksAdminRouter };
