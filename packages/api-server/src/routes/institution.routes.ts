import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  institutionSchema,
  updateInstitutionSchema,
  institutionFilterSchema,
} from '@campusconnect/shared/validation';
import { ApiErrorCodes, UserRole, OnboardingStatus } from '@campusconnect/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /institutions - List institutions (super admin only)
router.get('/', requireRole([UserRole.SUPER_ADMIN]), async (req: Request, res: Response) => {
  try {
    const validation = institutionFilterSchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { page = 1, limit = 20, search, status, onboardingStatus } = validation.data;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status !== undefined) {
      where.isActive = status;
    }

    if (onboardingStatus) {
      where.onboardingStatus = onboardingStatus;
    }

    const [institutions, total] = await Promise.all([
      prisma.institution.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          code: true,
          slug: true,
          city: true,
          state: true,
          country: true,
          email: true,
          phone: true,
          website: true,
          logo: true,
          primaryColor: true,
          isActive: true,
          isSuspended: true,
          onboardingStatus: true,
          totalUsers: true,
          totalFaculty: true,
          totalStudents: true,
          subscription: {
            select: {
              planType: true,
              status: true,
              currentPeriodEnd: true,
            },
          },
          _count: {
            select: {
              users: true,
              departments: true,
              appointments: true,
              tickets: true,
            },
          },
        },
      }),
      prisma.institution.count({ where }),
    ]);

    res.json({
      success: true,
      data: institutions,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get institutions error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// GET /institutions/:id - Get single institution
router.get('/:id', requireRole([UserRole.SUPER_ADMIN, UserRole.INSTITUTION_ADMIN]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Institution admin can only view their own institution
    if (req.user!.role === UserRole.INSTITUTION_ADMIN && req.user!.institutionId !== id) {
      return res.status(403).json({
        success: false,
        error: { code: 4003, message: 'Not authorized to view this institution' },
      });
    }

    const institution = await prisma.institution.findUnique({
      where: { id },
      include: {
        departments: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        subscription: true,
        _count: {
          select: {
            users: true,
            invitations: true,
            appointments: true,
            tickets: true,
            announcements: true,
          },
        },
      },
    });

    if (!institution) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      data: institution,
    });
  } catch (error) {
    logger.error({ error }, 'Get institution error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /institutions - Create institution (super admin only)
router.post('/', requireRole([UserRole.SUPER_ADMIN]), async (req: Request, res: Response) => {
  try {
    const validation = institutionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const data = validation.data;

    // Check if code or slug already exists
    const existing = await prisma.institution.findFirst({
      where: {
        OR: [
          { code: data.code },
          { slug: data.slug },
        ],
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: ApiErrorCodes.ALREADY_EXISTS,
      });
    }

    const institution = await prisma.institution.create({
      data,
    });

    logger.info(
      { userId: req.user!.id, institutionId: institution.id },
      'Institution created'
    );

    res.status(201).json({
      success: true,
      data: institution,
    });
  } catch (error) {
    logger.error({ error }, 'Create institution error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// PUT /institutions/:id - Update institution
router.put('/:id', requireRole([UserRole.SUPER_ADMIN, UserRole.INSTITUTION_ADMIN]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateInstitutionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const institution = await prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Institution admin can only update their own institution
    if (req.user!.role === UserRole.INSTITUTION_ADMIN && req.user!.institutionId !== id) {
      return res.status(403).json({
        success: false,
        error: { code: 4003, message: 'Not authorized to update this institution' },
      });
    }

    // Prevent updating certain fields for institution admin
    if (req.user!.role === UserRole.INSTITUTION_ADMIN) {
      delete validation.data.code;
      delete validation.data.slug;
      delete validation.data.onboardingStatus;
    }

    const updated = await prisma.institution.update({
      where: { id },
      data: validation.data,
    });

    logger.info(
      { userId: req.user!.id, institutionId: id },
      'Institution updated'
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Update institution error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /institutions/:id/activate - Activate institution
router.post('/:id/activate', requireRole([UserRole.SUPER_ADMIN]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const institution = await prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    const updated = await prisma.institution.update({
      where: { id },
      data: {
        isActive: true,
        isSuspended: false,
        suspensionReason: null,
      },
    });

    logger.info(
      { userId: req.user!.id, institutionId: id },
      'Institution activated'
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Activate institution error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /institutions/:id/suspend - Suspend institution
router.post('/:id/suspend', requireRole([UserRole.SUPER_ADMIN]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const institution = await prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    const updated = await prisma.institution.update({
      where: { id },
      data: {
        isActive: false,
        isSuspended: true,
        suspensionReason: reason || null,
      },
    });

    // Deactivate all users of this institution
    await prisma.user.updateMany({
      where: { institutionId: id },
      data: { isActive: false, isSuspended: true },
    });

    logger.info(
      { userId: req.user!.id, institutionId: id, reason },
      'Institution suspended'
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Suspend institution error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// GET /institutions/:id/stats - Get institution statistics
router.get('/:id/stats', requireRole([UserRole.SUPER_ADMIN, UserRole.INSTITUTION_ADMIN]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Institution admin can only view their own institution's stats
    if (req.user!.role === UserRole.INSTITUTION_ADMIN && req.user!.institutionId !== id) {
      return res.status(403).json({
        success: false,
        error: { code: 4003, message: 'Not authorized to view these stats' },
      });
    }

    const institution = await prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    const [
      userCounts,
      appointmentStats,
      ticketStats,
      tokenStats,
      recentActivity,
    ] = await Promise.all([
      // User counts by role
      prisma.user.groupBy({
        by: ['role'],
        where: { institutionId: id, isActive: true },
        _count: { role: true },
      }),
      // Appointment stats (last 30 days)
      prisma.appointment.groupBy({
        by: ['status'],
        where: {
          institutionId: id,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _count: { status: true },
      }),
      // Ticket stats
      prisma.supportTicket.groupBy({
        by: ['status'],
        where: { institutionId: id },
        _count: { status: true },
      }),
      // Token stats (today)
      prisma.token.groupBy({
        by: ['status'],
        where: {
          institutionId: id,
          createdAt: { gte: new Date().setHours(0, 0, 0, 0) },
        },
        _count: { status: true },
      }),
      // Recent activity (audit logs)
      prisma.auditLog.findMany({
        where: { institutionId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          entityType: true,
          userId: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdAt: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users: userCounts,
        appointments: appointmentStats,
        tickets: ticketStats,
        tokens: tokenStats,
        recentActivity,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get institution stats error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// PUT /institutions/:id/branding - Update institution branding
router.put('/:id/branding', requireRole([UserRole.SUPER_ADMIN, UserRole.INSTITUTION_ADMIN]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { logo, favicon, primaryColor } = req.body;

    // Institution admin can only update their own institution
    if (req.user!.role === UserRole.INSTITUTION_ADMIN && req.user!.institutionId !== id) {
      return res.status(403).json({
        success: false,
        error: { code: 4003, message: 'Not authorized to update this institution' },
      });
    }

    const institution = await prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    const updated = await prisma.institution.update({
      where: { id },
      data: {
        ...(logo && { logo }),
        ...(favicon && { favicon }),
        ...(primaryColor && { primaryColor }),
      },
    });

    logger.info(
      { userId: req.user!.id, institutionId: id },
      'Institution branding updated'
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Update institution branding error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

export default router;
