import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { authenticate } from '../middleware/auth.middleware';
import { tenantMiddleware, getTenantFilter } from '../middleware/tenant.middleware';
import { requirePermission, requireRole } from '../middleware/rbac.middleware';
import {
  userUpdateSchema,
  userFilterSchema,
  changePasswordSchema,
} from '@campusconnect/shared/validation';
import { ApiErrorCodes, Permissions, UserRole } from '@campusconnect/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /users - List users with filters
router.get('/', requirePermission(Permissions.USER_VIEW), async (req: Request, res: Response) => {
  try {
    const validation = userFilterSchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { page, limit, search, role, departmentId, isActive, isEmailVerified } = validation.data;
    const skip = (page - 1) * limit;
    const tenantFilter = getTenantFilter(req);

    const where: any = {
      ...tenantFilter,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (typeof isEmailVerified === 'boolean') {
      where.isEmailVerified = isEmailVerified;
    }

    // Regular admins cannot view super admins unless they're from different institution
    if (req.user!.role !== UserRole.SUPER_ADMIN) {
      where.role !== UserRole.SUPER_ADMIN;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          isSuspended: true,
          lastLoginAt: true,
          createdAt: true,
          institution: {
            select: { id: true, name: true, code: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
          studentProfile: true,
          facultyProfile: {
            select: {
              id: true,
              designation: true,
              specialization: true,
              currentStatus: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get users error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// GET /users/:id - Get single user
router.get('/:id', requirePermission(Permissions.USER_VIEW), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantFilter = getTenantFilter(req);

    const user = await prisma.user.findFirst({
      where: {
        id,
        ...tenantFilter,
      },
      include: {
        institution: {
          select: { id: true, name: true, code: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        studentProfile: true,
        facultyProfile: {
          include: {
            schedules: {
              orderBy: { dayOfWeek: 'asc' },
            },
            leaves: {
              orderBy: { startDate: 'desc' },
              take: 5,
            },
          },
        },
        refreshTokens: {
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Remove sensitive token data
    if (user.refreshTokens) {
      user.refreshTokens = user.refreshTokens.map(t => ({
        id: t.id,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
        userAgent: t.userAgent,
        ipAddress: t.ipAddress,
      }));
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error({ error }, 'Get user error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// PUT /users/:id - Update user
router.put('/:id', requirePermission(Permissions.USER_EDIT), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = userUpdateSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const tenantFilter = getTenantFilter(req);
    const user = await prisma.user.findFirst({
      where: { id, ...tenantFilter },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Prevent institution admins from updating super admins
    if (req.user!.role !== UserRole.SUPER_ADMIN && user.role === UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        error: { code: 4003, message: 'Cannot update super admin' },
      });
    }

    // Password update requires separate flow
    if (validation.data.password) {
      return res.status(400).json({
        success: false,
        error: { code: 4006, message: 'Use change password endpoint for password updates' },
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: validation.data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: true,
        institution: {
          select: { id: true, name: true, code: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    logger.info(
      { userId: req.user!.id, targetUserId: id },
      'User updated'
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Update user error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /users/:id/change-password - Change user password
router.post('/:id/change-password', requirePermission(Permissions.USER_EDIT), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = changePasswordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { currentPassword, newPassword } = validation.data;

    // Get user
    const user = await prisma.user.findFirst({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 4007, message: 'Current password is incorrect' },
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke all active sessions except current
    await prisma.refreshToken.updateMany({
      where: {
        userId: id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    logger.info(
      { userId: req.user!.id, targetUserId: id },
      'Password changed'
    );

    res.json({
      success: true,
      data: { message: 'Password changed successfully' },
    });
  } catch (error) {
    logger.error({ error }, 'Change password error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /users/:id/suspend - Suspend user
router.post('/:id/suspend', requirePermission(Permissions.USER_EDIT), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findFirst({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Cannot suspend super admin unless you are super admin
    if (user.role === UserRole.SUPER_ADMIN && req.user!.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        error: { code: 4003, message: 'Cannot suspend super admin' },
      });
    }

    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        isSuspended: true,
        suspensionReason: reason,
      },
    });

    // Revoke all sessions
    await prisma.refreshToken.updateMany({
      where: {
        userId: id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    logger.info(
      { userId: req.user!.id, targetUserId: id, reason },
      'User suspended'
    );

    res.json({
      success: true,
      data: { message: 'User suspended successfully' },
    });
  } catch (error) {
    logger.error({ error }, 'Suspend user error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /users/:id/activate - Activate user
router.post('/:id/activate', requirePermission(Permissions.USER_EDIT), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    await prisma.user.update({
      where: { id },
      data: {
        isActive: true,
        isSuspended: false,
        suspensionReason: null,
        lockedUntil: null,
        loginAttempts: 0,
      },
    });

    logger.info(
      { userId: req.user!.id, targetUserId: id },
      'User activated'
    );

    res.json({
      success: true,
      data: { message: 'User activated successfully' },
    });
  } catch (error) {
    logger.error({ error }, 'Activate user error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// GET /users/stats - Get user statistics (admin only)
router.get('/stats/users', requireRole([UserRole.SUPER_ADMIN, UserRole.INSTITUTION_ADMIN, UserRole.DEPARTMENT_ADMIN]), async (req: Request, res: Response) => {
  try {
    const tenantFilter = getTenantFilter(req);

    const [
      totalUsers,
      usersByRole,
      recentUsers,
      activeUsers,
    ] = await Promise.all([
      prisma.user.count({
        where: { ...tenantFilter, isActive: true },
      }),
      prisma.user.groupBy({
        by: ['role'],
        where: { ...tenantFilter, isActive: true },
        _count: { role: true },
      }),
      prisma.user.findMany({
        where: { ...tenantFilter },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.user.count({
        where: {
          ...tenantFilter,
          isActive: true,
          lastLoginAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        usersByRole,
        recentUsers,
        activeUsersLast7Days: activeUsers,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get user stats error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

export default router;
