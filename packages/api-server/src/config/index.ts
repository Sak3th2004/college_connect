import 'dotenv/config';

// Environment configuration
export const config = {
  // Server
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: 'v1',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10),
  
  // Email (Resend)
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'CampusConnect <noreply@campusconnect.app>',
  
  // File Storage (S3/R2)
  s3Endpoint: process.env.S3_ENDPOINT || '',
  s3Region: process.env.S3_REGION || 'auto',
  s3AccessKey: process.env.S3_ACCESS_KEY || '',
  s3SecretKey: process.env.S3_SECRET_KEY || '',
  s3Bucket: process.env.S3_BUCKET || 'campusconnect',
  
  // AI (Claude)
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  
  // Payments (Razorpay)
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Security
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
  lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
  
  // Session
  maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '3', 10),
  
  // Invitation
  invitationExpiryDays: parseInt(process.env.INVITATION_EXPIRY_DAYS || '7', 10),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;

// Validate required config in production
export function validateConfig() {
  if (config.nodeEnv === 'production') {
    const required = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Ensure secrets are not defaults
    if (config.jwtAccessSecret.includes('change-in-production')) {
      throw new Error('JWT_ACCESS_SECRET must be changed from default in production');
    }
    if (config.jwtRefreshSecret.includes('change-in-production')) {
      throw new Error('JWT_REFRESH_SECRET must be changed from default in production');
    }
  }
}
