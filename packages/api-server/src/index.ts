import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { config, validateConfig } from './config';
import logger from './utils/logger';
import prisma from './utils/prisma';
import { getRedis, closeRedis } from './utils/redis';
import { apiLimiter } from './middleware/rate-limit.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import facultyRoutes from './routes/faculty.routes';
import appointmentRoutes from './routes/appointment.routes';
import queueRoutes from './routes/queue.routes';
import institutionRoutes from './routes/institution.routes';
import departmentRoutes from './routes/department.routes';
import userRoutes from './routes/user.routes';
import notificationRoutes from './routes/notification.routes';
import supportRoutes from './routes/support.routes';
import healthRoutes from './routes/health.routes';

// Socket handlers
import { initializeSocketHandlers } from './socket';

// Validate environment
validateConfig();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.corsOrigins,
    credentials: true,
  },
  pingTimeout: 60000,
});

// Make io accessible in routes
app.set('io', io);

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Rate limiting
app.use(apiLimiter);

// Health check (no auth required)
app.use('/api/health', healthRoutes);

// API Routes
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/faculty', facultyRoutes);
apiRouter.use('/appointments', appointmentRoutes);
apiRouter.use('/queue', queueRoutes);
apiRouter.use('/institutions', institutionRoutes);
apiRouter.use('/departments', departmentRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/support', supportRoutes);

app.use(`/api/${config.apiVersion}`, apiRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 3001,
      message: 'Endpoint not found',
    },
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');
  
  res.status(500).json({
    success: false,
    error: {
      code: 5001,
      message: config.nodeEnv === 'production' 
        ? 'Internal server error' 
        : err.message,
    },
  });
});

// Initialize socket handlers
initializeSocketHandlers(io);

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  httpServer.close(async () => {
    logger.info('HTTP server closed');
    
    // Close database connections
    await prisma.$disconnect();
    logger.info('Database disconnected');
    
    // Close Redis
    await closeRedis();
    logger.info('Redis disconnected');
    
    process.exit(0);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const PORT = config.port;

httpServer.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${config.nodeEnv}`);
  
  // Test database connection
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (err) {
    logger.error({ err }, '❌ Database connection failed');
  }
  
  // Test Redis connection
  try {
    const redis = getRedis();
    await redis.ping();
    logger.info('✅ Redis connected');
  } catch (err) {
    logger.warn({ err }, '⚠️ Redis connection failed (some features may be unavailable)');
  }
});

export { app, httpServer, io };
