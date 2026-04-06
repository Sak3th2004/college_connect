import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { authLimiter, strictLimiter } from '../middleware/rate-limit.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@campusconnect/shared/validation';
import { ApiErrorCodes, UserRole, DefaultConfig } from '@campusconnect/shared';
import type { JWTPayload, AuthTokens } from '@campusconnect/shared/types';

const router = Router();

// Generate tokens
function generateTokens(user: { id: string; email: string; role: string; institutionId?: string | null; departmentId?: string | null }): AuthTokens {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role as any,
    institutionId: user.institutionId ?? undefined,
    departmentId: user.departmentId ?? undefined,
  };

  const accessToken = jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessExpiry,
  });

  const refreshToken = jwt.sign({ sub: user.id }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiry,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

// POST /auth/register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { email, password, firstName, lastName, role, institutionCode, invitationToken } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: ApiErrorCodes.ALREADY_EXISTS,
      });
    }

    let institutionId: string | undefined;
    let departmentId: string | undefined;

    // Handle invitation-based registration
    if (invitationToken) {
      const invitation = await prisma.invitation.findUnique({
        where: { token: invitationToken },
        include: { institution: true },
      });

      if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
        return res.status(400).json({
          success: false,
          error: { code: 2003, message: 'Invalid or expired invitation' },
        });
      }

      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          error: { code: 2004, message: 'Email does not match invitation' },
        });
      }

      institutionId = invitation.institutionId;
      departmentId = invitation.departmentId ?? undefined;

      // Mark invitation as accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
    }
    // Handle institution code registration
    else if (institutionCode) {
      const institution = await prisma.institution.findUnique({
        where: { code: institutionCode },
      });

      if (!institution || !institution.isActive) {
        return res.status(400).json({
          success: false,
          error: { code: 2005, message: 'Invalid institution code' },
        });
      }

      institutionId = institution.id;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: role as any,
        institutionId,
        departmentId,
        isEmailVerified: !!invitationToken, // Auto-verify if using invitation
      },
    });

    // Create profile based on role
    if (role === UserRole.STUDENT) {
      await prisma.studentProfile.create({
        data: { userId: user.id },
      });
    } else if (role === UserRole.FACULTY) {
      await prisma.facultyProfile.create({
        data: { userId: user.id },
      });
    }

    // Generate verification token if not using invitation
    if (!invitationToken) {
      const verificationToken = uuidv4();
      await prisma.verificationToken.create({
        data: {
          email,
          token: verificationToken,
          type: 'email_verification',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });
      // TODO: Send verification email
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    logger.info({ userId: user.id, email }, 'User registered');

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        tokens,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Registration error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /auth/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { email, password } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        facultyProfile: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.INVALID_CREDENTIALS,
      });
    }

    // Check account status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: ApiErrorCodes.ACCOUNT_SUSPENDED,
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        error: {
          ...ApiErrorCodes.ACCOUNT_SUSPENDED,
          message: user.suspensionReason || 'Account suspended',
        },
      });
    }

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(403).json({
        success: false,
        error: {
          ...ApiErrorCodes.ACCOUNT_LOCKED,
          message: `Account locked. Try again in ${remainingMinutes} minutes.`,
        },
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      // Increment login attempts
      const newAttempts = user.loginAttempts + 1;
      const updateData: any = { loginAttempts: newAttempts };
      
      if (newAttempts >= config.maxLoginAttempts) {
        updateData.lockedUntil = new Date(Date.now() + config.lockoutDurationMinutes * 60 * 1000);
        updateData.loginAttempts = 0;
      }
      
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.INVALID_CREDENTIALS,
      });
    }

    // Reset login attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Check max concurrent sessions
    const activeSessions = await prisma.refreshToken.count({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
    });

    if (activeSessions >= config.maxConcurrentSessions) {
      // Revoke oldest session
      const oldestSession = await prisma.refreshToken.findFirst({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
          revokedAt: null,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (oldestSession) {
        await prisma.refreshToken.update({
          where: { id: oldestSession.id },
          data: { revokedAt: new Date() },
        });
      }
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    logger.info({ userId: user.id, email }, 'User logged in');

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          institutionId: user.institutionId,
          departmentId: user.departmentId,
          isEmailVerified: user.isEmailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
        },
        tokens,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Login error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: ApiErrorCodes.VALIDATION_ERROR,
      });
    }

    // Verify refresh token
    let decoded: { sub: string };
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { sub: string };
    } catch {
      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.TOKEN_INVALID,
      });
    }

    // Check if token exists and is not revoked
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken || !storedToken.user.isActive) {
      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.TOKEN_INVALID,
      });
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    const tokens = generateTokens(storedToken.user);

    // Save new refresh token
    await prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    res.json({
      success: true,
      data: { tokens },
    });
  } catch (error) {
    logger.error({ error }, 'Token refresh error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    // Revoke all user's refresh tokens (full logout)
    await prisma.refreshToken.updateMany({
      where: {
        userId: req.user!.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    logger.info({ userId: req.user!.id }, 'User logged out');

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    logger.error({ error }, 'Logout error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        institution: {
          select: { id: true, name: true, code: true, logo: true, primaryColor: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        studentProfile: true,
        facultyProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          institution: user.institution,
          department: user.department,
          profile: user.studentProfile || user.facultyProfile,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get user error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /auth/forgot-password
router.post('/forgot-password', strictLimiter, async (req: Request, res: Response) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: ApiErrorCodes.VALIDATION_ERROR,
      });
    }

    const { email } = validation.data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        data: { message: 'If an account exists, a password reset link has been sent.' },
      });
    }

    // Delete any existing reset tokens
    await prisma.verificationToken.deleteMany({
      where: { email, type: 'password_reset' },
    });

    // Create new reset token
    const resetToken = uuidv4();
    await prisma.verificationToken.create({
      data: {
        email,
        token: resetToken,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Send password reset email

    logger.info({ email }, 'Password reset requested');

    res.json({
      success: true,
      data: { message: 'If an account exists, a password reset link has been sent.' },
    });
  } catch (error) {
    logger.error({ error }, 'Forgot password error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /auth/reset-password
router.post('/reset-password', strictLimiter, async (req: Request, res: Response) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { token, password } = validation.data;

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        type: 'password_reset',
        expiresAt: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        error: { code: 2006, message: 'Invalid or expired reset token' },
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

    // Update user password
    await prisma.user.update({
      where: { email: verificationToken.email },
      data: { passwordHash },
    });

    // Delete the used token
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    // Revoke all refresh tokens (force re-login)
    await prisma.refreshToken.updateMany({
      where: {
        user: { email: verificationToken.email },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    logger.info({ email: verificationToken.email }, 'Password reset completed');

    res.json({
      success: true,
      data: { message: 'Password has been reset successfully' },
    });
  } catch (error) {
    logger.error({ error }, 'Reset password error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /auth/verify-email
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const validation = verifyEmailSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: ApiErrorCodes.VALIDATION_ERROR,
      });
    }

    const { token } = validation.data;

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        type: 'email_verification',
        expiresAt: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        error: { code: 2007, message: 'Invalid or expired verification token' },
      });
    }

    // Update user as verified
    await prisma.user.update({
      where: { email: verificationToken.email },
      data: { isEmailVerified: true },
    });

    // Delete the used token
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    logger.info({ email: verificationToken.email }, 'Email verified');

    res.json({
      success: true,
      data: { message: 'Email verified successfully' },
    });
  } catch (error) {
    logger.error({ error }, 'Email verification error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

export default router;
