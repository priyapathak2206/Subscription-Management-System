import { createApp } from './app.js';
import { config } from './config/index.js';
import prisma from './db/prisma.js';
import { setupCronJobs } from './cron.js';
import { runRecurringBillingBatch } from './modules/invoices/invoices.service.js';

const app = createApp();

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log(' Connected to PostgreSQL database successfully.');

    // Initialize scheduled cron jobs (auto-close & recurring billing)
    setupCronJobs(runRecurringBillingBatch);
  } catch (err: any) {
    console.warn(' Database connection warning:', err.message);
    console.warn('  Ensure PostgreSQL is running via `docker-compose up -d` or a local instance.');
  }

  const server = app.listen(config.port, () => {
    console.log(` Brightloop Subscription Management Server listening on port ${config.port}`);
    console.log(`   Health: http://localhost:${config.port}/api/health`);
    console.log(`   Frontend URL: ${config.frontendUrl}`);
  });

  const shutdown = async () => {
    console.log('Shutting down server gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Server and database connections closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
