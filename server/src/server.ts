import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { clerkMiddleware } from '@clerk/express';
import { env } from './config/env.js';
import { initializeDatabase, getIsSQLite } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import onboardingRoutes from './routes/onboarding.routes.js';
import patientRoutes from './routes/patient.routes.js';
import lenderRoutes from './routes/lender.routes.js';
import clinicalRoutes from './routes/clinical.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';
import treatmentRoutes from './routes/treatment.routes.js';
import caseRoutes from './routes/case.routes.js';
import reportRoutes from './routes/report.routes.js';
import loanCompanyRoutes from './routes/loan-company.routes.js';
import loanOfferRoutes from './routes/loan-offer.routes.js';
const app = express();

// Security and utility middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline styles/scripts for API responses
  })
);

const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // In development mode, allow all origins
      if (env.isDev) return callback(null, true);
      // In production mode, verify against allowed origins list or matching CLIENT_URL
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  clerkMiddleware({
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  })
);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'curify-ai-backend',
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/lender', lenderRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/treatment-plans', treatmentRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/loan-companies', loanCompanyRoutes);
app.use('/api/loan-offers', loanOfferRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use(errorHandler);

// Start server
async function bootstrap() {
  try {
    await initializeDatabase();

    // Seed the database when using SQLite (on first run)
    // The seedDatabase function checks if data already exists and skips if so
    if (getIsSQLite()) {
      const { seedDatabase } = await import('./db/seed.js');
      await seedDatabase();
    }

    const server = app.listen(env.PORT, () => {
      console.log(`[Server] Curify AI Backend running on http://localhost:${env.PORT}`);
      console.log(`[Server] Health check: http://localhost:${env.PORT}/api/health`);
    });

    // Graceful shutdown handling for production orchestrators (Render, Docker, Kubernetes)
    const handleShutdown = async (signal: string) => {
      console.log(`[Server] ${signal} signal received. Gracefully shutting down...`);
      server.close(async () => {
        try {
          const { pool } = await import('./config/database.js');
          await pool.end();
          console.log('[Server] Database pool closed. Exiting process.');
          process.exit(0);
        } catch {
          process.exit(0);
        }
      });
      // Force exit after 10 seconds if shutdown hangs
      setTimeout(() => {
        console.error('[Server] Forced shutdown timeout exceeded.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (err) {
    console.error('[Server] Failed to initialize application:', err);
    process.exit(1);
  }
}

bootstrap();

export default app;
