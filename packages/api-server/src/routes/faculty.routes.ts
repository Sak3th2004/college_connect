import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { authenticate } from '../middleware/auth.middleware';
import { tenantMiddleware, getTenantFilter } from '../middleware/tenant.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { facultySearchSchema, updateFacultyStatusSchema, updateFacultyProfileSchema } from '@campusconnect/shared/validation';
import { ApiErrorCodes, Permissions, UserRole, FacultyStatus } from '@campusconnect/shared';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /faculty - List faculty with search and filters
router.get('/', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const validation = facultySearchSchema.safeParse(req.query);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { page, limit, sortBy, sortOrder, search, departmentId, status, isAcceptingAppointments } = validation.data;
    const skip = (page - 1) * limit;
    const tenantFilter = getTenantFilter(req);

    const where: any = {
      role: UserRole.FACULTY,
      isActive: true,
      isSuspended: false,
      ...tenantFilter,
    };

    // Search by name or email
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { facultyProfile: { designation: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (status) {
      where.facultyProfile = {
        ...where.facultyProfile,
        currentStatus: status,
      };
    }

    if (typeof isAcceptingAppointments === 'boolean') {
      where.facultyProfile = {
        ...where.facultyProfile,
        isAcceptingAppointments,
      };
    }

    const [faculty, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { firstName: 'asc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          department: {
            select: { id: true, name: true, code: true },
          },
          facultyProfile: {
            select: {
              id: true,
              designation: true,
              specialization: true,
              cabinNumber: true,
              building: true,
              floor: true,
              currentStatus: true,
              statusMessage: true,
              statusUpdatedAt: true,
              isAcceptingAppointments: true,
              appointmentSlotDuration: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: faculty,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get faculty list error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// GET /faculty/:id - Get single faculty details
router.get('/:id', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantFilter = getTenantFilter(req);

    const faculty = await prisma.user.findFirst({
      where: {
        id,
        role: UserRole.FACULTY,
        ...tenantFilter,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        department: {
          select: { id: true, name: true, code: true, building: true, floor: true },
        },
        facultyProfile: {
          select: {
            id: true,
            employeeId: true,
            designation: true,
            specialization: true,
            cabinNumber: true,
            building: true,
            floor: true,
            currentStatus: true,
            statusMessage: true,
            statusUpdatedAt: true,
            isAcceptingAppointments: true,
            maxDailyAppointments: true,
            appointmentSlotDuration: true,
          },
        },
      },
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      data: faculty,
    });
  } catch (error) {
    logger.error({ error }, 'Get faculty error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// PUT /faculty/status - Update own status (faculty only)
router.put('/status', requirePermission(Permissions.FACULTY_STATUS_UPDATE), async (req: Request, res: Response) => {
  try {
    const validation = updateFacultyStatusSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { status, message } = validation.data;

    const facultyProfile = await prisma.facultyProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!facultyProfile) {
      return res.status(404).json({
        success: false,
        error: { code: 3001, message: 'Faculty profile not found' },
      });
    }

    const updatedProfile = await prisma.facultyProfile.update({
      where: { id: facultyProfile.id },
      data: {
        currentStatus: status,
        statusMessage: message,
        statusUpdatedAt: new Date(),
      },
    });

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`institution:${req.user!.institutionId}`).emit('faculty:status:changed', {
        facultyId: req.user!.id,
        status,
        message,
        updatedAt: updatedProfile.statusUpdatedAt,
      });
    }

    logger.info({ userId: req.user!.id, status }, 'Faculty status updated');

    res.json({
      success: true,
      data: {
        currentStatus: updatedProfile.currentStatus,
        statusMessage: updatedProfile.statusMessage,
        statusUpdatedAt: updatedProfile.statusUpdatedAt,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Update faculty status error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// PUT /faculty/profile - Update own profile (faculty only)
router.put('/profile', requirePermission(Permissions.FACULTY_STATUS_UPDATE), async (req: Request, res: Response) => {
  try {
    const validation = updateFacultyProfileSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const facultyProfile = await prisma.facultyProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!facultyProfile) {
      return res.status(404).json({
        success: false,
        error: { code: 3001, message: 'Faculty profile not found' },
      });
    }

    const updatedProfile = await prisma.facultyProfile.update({
      where: { id: facultyProfile.id },
      data: validation.data,
    });

    res.json({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    logger.error({ error }, 'Update faculty profile error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// GET /faculty/:id/schedule - Get faculty schedule
router.get('/:id/schedule', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const facultyProfile = await prisma.facultyProfile.findFirst({
      where: {
        userId: id,
        user: getTenantFilter(req),
      },
    });

    if (!facultyProfile) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    const schedules = await prisma.facultySchedule.findMany({
      where: { facultyId: facultyProfile.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    logger.error({ error }, 'Get faculty schedule error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// GET /faculty/:id/availability - Get faculty availability for a date
router.get('/:id/availability', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const date = req.query.date as string;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: { code: 2001, message: 'Date parameter is required' },
      });
    }

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    const facultyProfile = await prisma.facultyProfile.findFirst({
      where: {
        userId: id,
        user: getTenantFilter(req),
      },
      include: {
        user: {
          include: { institution: true },
        },
      },
    });

    if (!facultyProfile) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Check if faculty is on leave
    const leave = await prisma.facultyLeave.findFirst({
      where: {
        facultyId: facultyProfile.id,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
        isApproved: true,
      },
    });

    if (leave) {
      return res.json({
        success: true,
        data: {
          isAvailable: false,
          reason: 'On leave',
          leaveType: leave.leaveType,
        },
      });
    }

    // Get schedule for this day
    const schedules = await prisma.facultySchedule.findMany({
      where: {
        facultyId: facultyProfile.id,
        dayOfWeek,
      },
      orderBy: { startTime: 'asc' },
    });

    // Get existing appointments for this date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        facultyId: id,
        requestedDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { in: ['APPROVED', 'REQUESTED'] },
      },
      select: {
        confirmedStartTime: true,
        confirmedEndTime: true,
        requestedStartTime: true,
        requestedEndTime: true,
        status: true,
      },
    });

    // Calculate available slots (office hours minus booked appointments)
    const officeHours = schedules.filter(s => s.scheduleType === 'OFFICE_HOURS');
    
    res.json({
      success: true,
      data: {
        isAvailable: facultyProfile.isAcceptingAppointments,
        currentStatus: facultyProfile.currentStatus,
        slotDuration: facultyProfile.appointmentSlotDuration,
        officeHours,
        bookedSlots: appointments,
        date,
        dayOfWeek,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get faculty availability error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

export default router;
