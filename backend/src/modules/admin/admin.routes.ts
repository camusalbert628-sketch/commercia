import { Router } from 'express';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// Middleware to check admin status
const requireAdmin = async (req: AuthRequest, _res: any, next: any) => {
  const user = await req.prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !user.isAdmin) {
    return next(new AppError('Accès réservé aux administrateurs.', 403));
  }
  next();
};

router.use(requireAdmin);

// GET /api/admin/stats — Métriques SaaS & Business
router.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const [
      totalUsers,
      totalBusinesses,
      totalSales,
      subscriptions,
      recentUsers,
    ] = await Promise.all([
      req.prisma.user.count(),
      req.prisma.business.count(),
      req.prisma.sale.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      req.prisma.subscription.findMany({
        include: { plan: true },
      }),
      req.prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          businesses: { include: { business: true } },
          subscription: { include: { plan: true } },
        },
      }),
    ]);

    // Calculate MRR
    let mrr = 0;
    subscriptions.forEach((sub: any) => {
      if (sub.status === 'active' && sub.plan) {
        mrr += sub.plan.priceMonthly;
      }
    });

    res.json({
      metrics: {
        totalUsers,
        totalBusinesses,
        totalSalesVolume: totalSales._sum.totalAmount || 0,
        totalSalesCount: totalSales._count.id,
        activeSubscriptionsCount: subscriptions.filter((s: any) => s.status === 'active').length,
        estimatedMRR: mrr,
      },
      recentUsers: recentUsers.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`,
        phone: u.phone,
        createdAt: u.createdAt,
        isActive: u.isActive,
        businessCount: u.businesses.length,
        plan: u.subscription?.plan?.displayName || 'Gratuit',
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users — Liste complète des utilisateurs
router.get('/users', async (req: AuthRequest, res, next) => {
  try {
    const users = await req.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        businesses: { include: { business: true } },
        subscription: { include: { plan: true } },
      },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/toggle — Activer / Suspendre un utilisateur
router.put('/users/:id/toggle', async (req: AuthRequest, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError('Utilisateur non trouvé.', 404);

    const updated = await req.prisma.user.update({
      where: { id: user.id },
      data: { isActive: !user.isActive },
    });

    res.json({
      message: `Compte ${updated.isActive ? 'réactivé' : 'suspendu'}.`,
      isActive: updated.isActive,
    });
  } catch (error) {
    next(error);
  }
});

export { router as adminRouter };
