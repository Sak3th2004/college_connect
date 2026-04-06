import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { authenticate } from '../middleware/auth.middleware';
import { tenantMiddleware, getTenantFilter } from '../middleware/tenant.middleware';
import { requirePermission, requireRole } from '../middleware/rbac.middleware';
import { 
  createAppointmentSchema, 
  updateAppointmentStatusSchema, 
  rescheduleAppointmentSchema,
  rateAppointmentSchema,
  appointmentFilterSchema,
} from '@campusconnect/shared/validation';
import { ApiErrorCodes, Permissions, UserRole, AppointmentStatus } from '@campusconnect/shared';

const router = Router();

router.use(authenticate);

// GET /appointments - List appointments with filters
router.get('/', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const validation = appointmentFilterSchema.safeParse(req.query);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { page, limit, sortOrder, status, facultyId, studentId, departmentId, startDate, endDate } = validation.data;
    const skip = (page - 1) * limit;
    const tenantFilter = getTenantFilter(req);

    const where: any = { ...tenantFilter };

    // Scope to user's own appointments unless they have permission to view all
    if (req.user!.role === UserRole.STUDENT) {
      where.studentId = req.user!.id;
    } else if (req.user!.role === UserRole.FACULTY) {
      where.facultyId = req.user!.id;
    }

    // Apply filters
    if (status) where.status = status;
    if (facultyId) where.facultyId = facultyId;
    if (studentId) where.studentId = studentId;
    if (departmentId) where.departmentId = departmentId;
    
    if (startDate || endDate) {
      where.requestedDate = {};
      if (startDate) where.requestedDate.gte = new Date(startDate);
      if (endDate) where.requestedDate.lte = new Date(endDate);
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedDate: sortOrder },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
          },
          faculty: {
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              email: true, 
              avatar: true,
              facultyProfile: {
                select: { cabinNumber: true, designation: true },
              },
            },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
          documents: {
            select: { id: true, fileName: true, fileType: true, fileSize: true },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({
      success: true,
      data: appointments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get appointments error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /appointments - Create new appointment
router.post('/', requirePermission(Permissions.APPOINTMENT_CREATE), tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const validation = createAppointmentSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { facultyId, title, purpose, requestedDate, requestedStartTime, requestedEndTime, priority, studentNotes } = validation.data;

    // Verify faculty exists and is accepting appointments
    const faculty = await prisma.user.findFirst({
      where: {
        id: facultyId,
        role: UserRole.FACULTY,
        institutionId: req.tenantId,
      },
      include: {
        facultyProfile: true,
        institution: true,
      },
    });

    if (!faculty || !faculty.facultyProfile?.isAcceptingAppointments) {
      return res.status(400).json({
        success: false,
        error: { code: 3002, message: 'Faculty not found or not accepting appointments' },
      });
    }

    // Check daily appointment limit for student
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await prisma.appointment.count({
      where: {
        studentId: req.user!.id,
        createdAt: { gte: today, lt: tomorrow },
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
    });

    const maxAppointments = faculty.institution?.maxAppointmentsPerStudent || 3;
    if (todayAppointments >= maxAppointments) {
      return res.status(400).json({
        success: false,
        error: { code: 3003, message: `You can only request ${maxAppointments} appointments per day` },
      });
    }

    // Check for conflicting appointments
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        facultyId,
        requestedDate: new Date(requestedDate),
        requestedStartTime,
        status: { in: ['APPROVED', 'REQUESTED'] },
      },
    });

    if (conflictingAppointment) {
      return res.status(400).json({
        success: false,
        error: { code: 3004, message: 'This time slot is already booked' },
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        institutionId: req.tenantId!,
        studentId: req.user!.id,
        facultyId,
        departmentId: faculty.departmentId,
        title,
        purpose,
        requestedDate: new Date(requestedDate),
        requestedStartTime,
        requestedEndTime,
        priority: priority as any,
        studentNotes,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        faculty: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Create notification for faculty
    await prisma.notification.create({
      data: {
        userId: facultyId,
        institutionId: req.tenantId,
        type: 'APPOINTMENT_REQUESTED',
        title: 'New Appointment Request',
        message: `${appointment.student.firstName} ${appointment.student.lastName} has requested an appointment for ${requestedDate}`,
        data: { appointmentId: appointment.id },
        actionUrl: `/faculty/appointments/${appointment.id}`,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${facultyId}`).emit('appointment:created', {
        appointment,
        type: 'APPOINTMENT_REQUESTED',
      });
    }

    logger.info({ appointmentId: appointment.id, studentId: req.user!.id, facultyId }, 'Appointment created');

    res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    logger.error({ error }, 'Create appointment error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// GET /appointments/:id - Get single appointment
router.get('/:id', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantFilter = getTenantFilter(req);

    const appointment = await prisma.appointment.findFirst({
      where: { id, ...tenantFilter },
      include: {
        student: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true, 
            avatar: true,
            studentProfile: {
              select: { rollNumber: true, program: true, semester: true },
            },
          },
        },
        faculty: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true, 
            avatar: true,
            facultyProfile: {
              select: { designation: true, cabinNumber: true, building: true, floor: true },
            },
          },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        documents: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Check access - must be student, faculty, or admin
    const isOwner = appointment.studentId === req.user!.id || appointment.facultyId === req.user!.id;
    const isAdmin = [UserRole.DEPARTMENT_ADMIN, UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN].includes(req.user!.role as any);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: ApiErrorCodes.FORBIDDEN,
      });
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    logger.error({ error }, 'Get appointment error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// PUT /appointments/:id/status - Update appointment status
router.put('/:id/status', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateAppointmentStatusSchema.safeParse(req.body);
    
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
    const appointment = await prisma.appointment.findFirst({
      where: { id, ...tenantFilter },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        faculty: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Permission checks based on action
    const { status } = validation.data;
    const isStudent = req.user!.id === appointment.studentId;
    const isFaculty = req.user!.id === appointment.facultyId;

    // Students can only cancel their own appointments
    if (isStudent && status !== AppointmentStatus.CANCELLED) {
      return res.status(403).json({
        success: false,
        error: ApiErrorCodes.FORBIDDEN,
      });
    }

    // Faculty can approve, reject, complete
    if (!isFaculty && !isStudent) {
      // Check if admin
      const isAdmin = [UserRole.DEPARTMENT_ADMIN, UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN].includes(req.user!.role as any);
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: ApiErrorCodes.FORBIDDEN,
        });
      }
    }

    const updateData: any = { status };
    
    if (status === AppointmentStatus.APPROVED) {
      updateData.confirmedDate = validation.data.confirmedDate ? new Date(validation.data.confirmedDate) : appointment.requestedDate;
      updateData.confirmedStartTime = validation.data.confirmedStartTime || appointment.requestedStartTime;
      updateData.confirmedEndTime = validation.data.confirmedEndTime || appointment.requestedEndTime;
    }
    
    if (status === AppointmentStatus.REJECTED) {
      updateData.rejectionReason = validation.data.rejectionReason;
    }
    
    if (status === AppointmentStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    if (validation.data.facultyNotes) {
      updateData.facultyNotes = validation.data.facultyNotes;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
    });

    // Create notification
    let notificationUserId = isStudent ? appointment.facultyId : appointment.studentId;
    let notificationType: any = `APPOINTMENT_${status}`;
    let notificationTitle = '';
    let notificationMessage = '';

    switch (status) {
      case AppointmentStatus.APPROVED:
        notificationTitle = 'Appointment Approved';
        notificationMessage = `Your appointment with ${appointment.faculty.firstName} ${appointment.faculty.lastName} has been approved`;
        break;
      case AppointmentStatus.REJECTED:
        notificationTitle = 'Appointment Rejected';
        notificationMessage = `Your appointment with ${appointment.faculty.firstName} ${appointment.faculty.lastName} has been rejected`;
        break;
      case AppointmentStatus.CANCELLED:
        notificationTitle = 'Appointment Cancelled';
        notificationMessage = isStudent 
          ? `${appointment.student.firstName} ${appointment.student.lastName} has cancelled their appointment`
          : `Your appointment has been cancelled`;
        notificationUserId = isStudent ? appointment.facultyId : appointment.studentId;
        break;
    }

    if (notificationTitle) {
      await prisma.notification.create({
        data: {
          userId: notificationUserId,
          institutionId: req.tenantId,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          data: { appointmentId: id },
        },
      });

      // Socket notification
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${notificationUserId}`).emit('notification', {
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          appointmentId: id,
        });
      }
    }

    logger.info({ appointmentId: id, status, userId: req.user!.id }, 'Appointment status updated');

    res.json({
      success: true,
      data: updatedAppointment,
    });
  } catch (error) {
    logger.error({ error }, 'Update appointment status error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /appointments/:id/rate - Rate completed appointment
router.post('/:id/rate', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = rateAppointmentSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        studentId: req.user!.id,
        status: AppointmentStatus.COMPLETED,
      },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 3001, message: 'Completed appointment not found' },
      });
    }

    if (appointment.rating) {
      return res.status(400).json({
        success: false,
        error: { code: 3005, message: 'Appointment already rated' },
      });
    }

    const { rating, feedback } = validation.data;

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { rating, feedback },
    });

    res.json({
      success: true,
      data: updatedAppointment,
    });
  } catch (error) {
    logger.error({ error }, 'Rate appointment error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

export default router;
