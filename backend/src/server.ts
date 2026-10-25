import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

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
import { errorHandler } from './middleware/errorHandler';


dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Global middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
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


// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
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
