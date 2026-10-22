import { Router } from 'express';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /api/notifications — Liste des notifications
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const notifications = await req.prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await req.prisma.notification.count({
      where: { userId: req.userId, isRead: false },
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/:id/read — Marquer comme lue
router.put('/:id/read', async (req: AuthRequest, res, next) => {
  try {
    const notification = await req.prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!notification) throw new AppError('Notification introuvable.', 404);

    const updated = await req.prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/read-all — Tout marquer comme lu
router.put('/read-all', async (req: AuthRequest, res, next) => {
  try {
    await req.prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'Toutes les notifications ont été marquées comme lues.' });
  } catch (error) {
    next(error);
  }
});

export { router as notificationsRouter };
