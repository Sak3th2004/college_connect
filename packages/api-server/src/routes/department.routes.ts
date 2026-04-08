import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { authenticate } from '../middleware/auth.middleware';
import { tenantMiddleware, getTenantFilter } from '../middleware/tenant.middleware';
import { requirePermission, requireRole } from '../middleware/rbac.middleware';
import {
  departmentSchema,
  updateDepartmentSchema,
  departmentFilterSchema,
} from '@campusconnect/shared/validation';
import { ApiErrorCodes, Permissions, UserRole } from '@campusconnect/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /departments - List departments with filters
router.get('/', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const validation = departmentFilterSchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { page, limit, search, isActive } = validation.data;
    const skip = (page - 1) * limit;
    const tenantFilter = getTenantFilter(req);

    const where: any = {
      ...tenantFilter,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          institution: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: {
              users: true,
              invitations: true,
              appointments: true,
            },
          },
        },
      }),
      prisma.department.count({ where }),
    ]);

    res.json({
      success: true,
      data: departments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get departments error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// GET /departments/:id - Get single department
router.get('/:id', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantFilter = getTenantFilter(req);

    const department = await prisma.department.findFirst({
      where: {
        id,
        ...tenantFilter,
      },
      include: {
        institution: {
          select: { id: true, name: true, code: true },
        },
        headOfDepartmentUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    logger.error({ error }, 'Get department error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /departments - Create department (institution admin or super admin)
router.post(
  '/',
  requireRole([UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: Request, res: Response) => {
    try {
      const validation = departmentSchema.safeParse(req.body);

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
      const tenantFilter = getTenantFilter(req);

      // Ensure institutionId matches tenant or set it automatically for institution admin
      let institutionId = data.institutionId;
      if (req.user!.role === UserRole.INSTITUTION_ADMIN) {
        institutionId = req.user!.institutionId;
        if (data.institutionId && data.institutionId !== institutionId) {
          return res.status(403).json({
            success: false,
            error: { code: 4001, message: 'Cannot create department for another institution' },
          });
        }
        if (!institutionId) {
          return res.status(400).json({
            success: false,
            error: { code: 2001, message: 'Institution ID is required' },
          });
        }
      }

      // Check if department code already exists for this institution
      const existing = await prisma.department.findFirst({
        where: {
          institutionId,
          code: data.code,
        },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: {
            ...ApiErrorCodes.ALREADY_EXISTS,
            message: `Department with code ${data.code} already exists`,
          },
        });
      }

      const department = await prisma.department.create({
        data: {
          ...data,
          institutionId,
        },
        include: {
          institution: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      logger.info(
        { userId: req.user!.id, departmentId: department.id },
        'Department created'
      );

      res.status(201).json({
        success: true,
        data: department,
      });
    } catch (error) {
      logger.error({ error }, 'Create department error');
      res.status(500).json({
        success: false,
        error: ApiErrorCodes.INTERNAL_ERROR,
      });
    }
  }
);

// PUT /departments/:id - Update department
router.put(
  '/:id',
  requireRole([UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validation = updateDepartmentSchema.safeParse(req.body);

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
      const department = await prisma.department.findFirst({
        where: { id, ...tenantFilter },
      });

      if (!department) {
        return res.status(404).json({
          success: false,
          error: ApiErrorCodes.NOT_FOUND,
        });
      }

      // Institution admin can only update their own institution's departments
      if (req.user!.role === UserRole.INSTITUTION_ADMIN && department.institutionId !== req.user!.institutionId) {
        return res.status(403).json({
          success: false,
          error: { code: 4003, message: 'Not authorized to update this department' },
        });
      }

      const updated = await prisma.department.update({
        where: { id },
        data: validation.data,
        include: {
          institution: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      logger.info(
        { userId: req.user!.id, departmentId: id },
        'Department updated'
      );

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      logger.error({ error }, 'Update department error');
      res.status(500).json({
        success: false,
        error: ApiErrorCodes.INTERNAL_ERROR,
      });
    }
  }
);

// DELETE /departments/:id - Delete department (soft delete by deactivating)
router.delete(
  '/:id',
  requireRole([UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const tenantFilter = getTenantFilter(req);

      const department = await prisma.department.findFirst({
        where: { id, ...tenantFilter },
      });

      if (!department) {
        return res.status(404).json({
          success: false,
          error: ApiErrorCodes.NOT_FOUND,
        });
      }

      // Institution admin can only delete their own institution's departments
      if (req.user!.role === UserRole.INSTITUTION_ADMIN && department.institutionId !== req.user!.institutionId) {
        return res.status(403).json({
          success: false,
          error: { code: 4003, message: 'Not authorized to delete this department' },
        });
      }

      // Check if department has users
      const userCount = await prisma.user.count({
        where: { departmentId: id },
      });

      if (userCount > 0) {
        return res.status(400).json({
          success: false,
          error: { code: 4002, message: 'Cannot delete department with assigned users' },
        });
      }

      await prisma.department.update({
        where: { id },
        data: { isActive: false },
      });

      logger.info(
        { userId: req.user!.id, departmentId: id },
        'Department deactivated'
      );

      res.json({
        success: true,
        data: { message: 'Department deactivated successfully' },
      });
    } catch (error) {
      logger.error({ error }, 'Delete department error');
      res.status(500).json({
        success: false,
        error: ApiErrorCodes.INTERNAL_ERROR,
      });
    }
  }
);

// GET /departments/:id/users - Get users in department
router.get('/:id/users', requirePermission(Permissions.USER_VIEW), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, role } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const tenantFilter = getTenantFilter(req);

    const department = await prisma.department.findFirst({
      where: { id, ...tenantFilter },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    const where: any = {
      departmentId: id,
      isActive: true,
    };

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { lastName: 'asc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          isEmailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          studentProfile: true,
          facultyProfile: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get department users error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// PUT /departments/:id/head - Assign head of department
router.put(
  '/:id/head',
  requireRole([UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: { code: 2001, message: 'User ID is required' },
        });
      }

      const tenantFilter = getTenantFilter(req);
      const department = await prisma.department.findFirst({
        where: { id, ...tenantFilter },
      });

      if (!department) {
        return res.status(404).json({
          success: false,
          error: ApiErrorCodes.NOT_FOUND,
        });
      }

      // Verify user belongs to this department
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          departmentId: id,
          isActive: true,
        },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: { code: 4004, message: 'User not found or not in this department' },
        });
      }

      // Only faculty or admins can be head
      if (![UserRole.FACULTY, UserRole.DEPARTMENT_ADMIN, UserRole.INSTITUTION_ADMIN].includes(user.role)) {
        return res.status(400).json({
          success: false,
          error: { code: 4005, message: 'Only faculty or admin can be head of department' },
        });
      }

      const updated = await prisma.department.update({
        where: { id },
        data: { headOfDepartment: userId },
      });

      logger.info(
        { userId: req.user!.id, departmentId: id, headUserId: userId },
        'Department head assigned'
      );

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      logger.error({ error }, 'Assign department head error');
      res.status(500).json({
        success: false,
        error: ApiErrorCodes.INTERNAL_ERROR,
      });
    }
  }
);

export default router;
