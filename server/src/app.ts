import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import plansRoutes from './modules/plans/plans.routes.js';
import taxesRoutes from './modules/taxes/taxes.routes.js';
import discountsRoutes from './modules/discounts/discounts.routes.js';

// Billing & Reporting Routes (Stream B)
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes.js';
import templatesRoutes from './modules/subscriptions/templates.routes.js';
import invoicesRoutes from './modules/invoices/invoices.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';

import { errorHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { config } from './config/index.js';

export function createApp(): Express {
  const app = express();

  // Security Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: [config.clientUrl, config.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body Parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // General API Rate Limiting
  app.use('/api', apiRateLimiter);

  // Root & Health Check
  app.get('/', (_req, res) => {
    res.status(200).json({ name: 'Brightloop Subscription Management API', status: 'running' });
  });

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Modules (Boundary: Foundation & Catalog)
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/plans', plansRoutes);
  app.use('/api/taxes', taxesRoutes);
  app.use('/api/discounts', discountsRoutes);

  // Modules (Billing & Reporting)
  app.use('/api/quotation-templates', templatesRoutes);
  app.use('/api/subscriptions', subscriptionsRoutes);
  app.use('/api/invoices', invoicesRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/reports', reportsRoutes);

  // 404 Handler
  app.use((_req, res) => {
    res.status(404).json({ message: 'Requested resource or route was not found.' });
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp();
