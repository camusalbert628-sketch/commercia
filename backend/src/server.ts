import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { getAllowedOrigins, getJwtSecret } from './config/security';
import { telemetryMiddleware } from './utils/telemetry';

import { authRouter } from './modules/auth/auth.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { salesRouter } from './modules/sales/sales.routes';
import { expensesRouter } from './modules/expenses/expenses.routes';
import { customersRouter } from './modules/customers/customers.routes';
import { productsRouter } from './modules/products/products.routes';
import { analyticsRouter } from './modules/analytics/analytics.routes';
import { plansRouter } from './modules/subscriptions/plans.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { cashRouter } from './modules/cash/cash.routes';
import { aiRouter } from './modules/ai/ai.routes';
import { subscriptionRouter } from './modules/subscriptions/subscription.routes';
import { paymentsRouter } from './modules/payments/payments.routes';
import { growthRouter } from './modules/growth/growth.routes';
import { lotsRouter } from './modules/lots/lots.routes';
import { businessRouter } from './modules/business/business.routes';
import { foodPrepRouter } from './modules/foodPrep/foodPrep.routes';
import { serviceOrdersRouter } from './modules/serviceOrders/serviceOrders.routes';
import { mobileMoneyRouter } from './modules/mobileMoney/mobileMoney.routes';
import { feedbackRouter } from './modules/feedback/feedback.routes';
import { errorHandler } from './middleware/errorHandler';


dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Global middleware avec hardening de sécurité
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'https:', 'http://localhost:3001', 'ws:', 'wss:'],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);
app.use(compression());
app.use(morgan('dev'));
app.use(telemetryMiddleware);
app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Rate limiting (1000 requêtes par fenêtre de 15 minutes pour permettre navigation fluide et métriques en direct)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Make prisma available in req
app.use((req: any, _res, next) => {
  req.prisma = prisma;
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/sales', salesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/plans', plansRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/cash', cashRouter);
app.use('/api/growth', growthRouter);
app.use('/api/lots', lotsRouter);
app.use('/api/business', businessRouter);
app.use('/api/food-prep', foodPrepRouter);
app.use('/api/service-orders', serviceOrdersRouter);
app.use('/api/mobile-money', mobileMoneyRouter);
app.use('/api/feedback', feedbackRouter);


// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Audit de démarrage des secrets critiques
    getJwtSecret();

    await prisma.$connect();
    console.log('✅ Base de données connectée');
    
    app.listen(PORT, () => {
      console.log(`🚀 COMMERCIA Backend démarré sur le port ${PORT}`);
      console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Erreur de démarrage:', error);
    process.exit(1);
  }
};

if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app, prisma };
