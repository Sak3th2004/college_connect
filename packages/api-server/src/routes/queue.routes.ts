import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { authenticate } from '../middleware/auth.middleware';
import { tenantMiddleware, getTenantFilter } from '../middleware/tenant.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { joinQueueSchema, paginationSchema } from '@campusconnect/shared/validation';
import { ApiErrorCodes, Permissions, TokenStatus, FacultyStatus, UserRole } from '@campusconnect/shared';

const router = Router();

router.use(authenticate);

// GET /queue/:facultyId - Get current queue for a faculty
router.get('/:facultyId', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const { facultyId } = req.params;
    const tenantFilter = getTenantFilter(req);

    // Get today's tokens
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tokens = await prisma.token.findMany({
      where: {
        facultyId,
        ...tenantFilter,
        createdAt: { gte: today },
        status: { in: [TokenStatus.WAITING, TokenStatus.CALLED, TokenStatus.IN_PROGRESS] },
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        appointment: {
          select: { id: true, title: true, purpose: true },
        },
      },
      orderBy: { tokenNumber: 'asc' },
    });

    // Get current serving token
    const currentToken = tokens.find(t => t.status === TokenStatus.IN_PROGRESS || t.status === TokenStatus.CALLED);

    // Calculate queue position for waiting tokens
    const waitingTokens = tokens.filter(t => t.status === TokenStatus.WAITING);
    
    res.json({
      success: true,
      data: {
        queue: tokens,
        currentToken: currentToken || null,
        waitingCount: waitingTokens.length,
        totalServedToday: await prisma.token.count({
          where: {
            facultyId,
            ...tenantFilter,
            createdAt: { gte: today },
            status: TokenStatus.COMPLETED,
          },
        }),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get queue error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /queue/join - Join the queue for a faculty
router.post('/join', requirePermission(Permissions.QUEUE_JOIN), tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const validation = joinQueueSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { facultyId, purpose } = validation.data;

    // Check if faculty is accepting and available
    const faculty = await prisma.user.findFirst({
      where: {
        id: facultyId,
        role: UserRole.FACULTY,
        institutionId: req.tenantId,
      },
      include: {
        facultyProfile: true,
      },
    });

    if (!faculty || !faculty.facultyProfile) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    if (faculty.facultyProfile.currentStatus === FacultyStatus.OFFLINE ||
        faculty.facultyProfile.currentStatus === FacultyStatus.ON_LEAVE ||
        faculty.facultyProfile.currentStatus === FacultyStatus.DO_NOT_DISTURB) {
      return res.status(400).json({
        success: false,
        error: { code: 3006, message: 'Faculty is not available for queue' },
      });
    }

    // Check if student already in queue
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingToken = await prisma.token.findFirst({
      where: {
        studentId: req.user!.id,
        facultyId,
        createdAt: { gte: today },
        status: { in: [TokenStatus.WAITING, TokenStatus.CALLED, TokenStatus.IN_PROGRESS] },
      },
    });

    if (existingToken) {
      return res.status(400).json({
        success: false,
        error: { code: 3007, message: 'You are already in this queue' },
        data: { existingToken },
      });
    }

    // Get next token number for today
    const lastToken = await prisma.token.findFirst({
      where: {
        facultyId,
        institutionId: req.tenantId!,
        createdAt: { gte: today },
      },
      orderBy: { tokenNumber: 'desc' },
    });

    const nextTokenNumber = (lastToken?.tokenNumber || 0) + 1;
    const tokenDisplay = `T${String(nextTokenNumber).padStart(3, '0')}`;

    // Count current waiting
    const waitingCount = await prisma.token.count({
      where: {
        facultyId,
        institutionId: req.tenantId!,
        createdAt: { gte: today },
        status: TokenStatus.WAITING,
      },
    });

    // Estimate wait time (assuming 10 minutes per token)
    const estimatedWaitMinutes = (waitingCount + 1) * 10;

    const token = await prisma.token.create({
      data: {
        institutionId: req.tenantId!,
        facultyId,
        studentId: req.user!.id,
        tokenNumber: nextTokenNumber,
        tokenDisplay,
        queuePosition: waitingCount + 1,
        estimatedWaitMinutes,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        faculty: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Notify faculty via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`faculty:${facultyId}`).emit('queue:updated', {
        type: 'STUDENT_JOINED',
        token,
        waitingCount: waitingCount + 1,
      });
    }

    logger.info({ tokenId: token.id, studentId: req.user!.id, facultyId }, 'Student joined queue');

    res.status(201).json({
      success: true,
      data: {
        token,
        queuePosition: waitingCount + 1,
        estimatedWaitMinutes,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Join queue error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /queue/call-next - Faculty calls next token
router.post('/call-next', requirePermission(Permissions.QUEUE_CALL_NEXT), tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Mark any current IN_PROGRESS as completed
    await prisma.token.updateMany({
      where: {
        facultyId: req.user!.id,
        createdAt: { gte: today },
        status: TokenStatus.IN_PROGRESS,
      },
      data: {
        status: TokenStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Get next waiting token
    const nextToken = await prisma.token.findFirst({
      where: {
        facultyId: req.user!.id,
        institutionId: req.tenantId!,
        createdAt: { gte: today },
        status: TokenStatus.WAITING,
      },
      orderBy: { tokenNumber: 'asc' },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!nextToken) {
      return res.json({
        success: true,
        data: { message: 'No more tokens in queue', currentToken: null },
      });
    }

    // Update token status
    const calledToken = await prisma.token.update({
      where: { id: nextToken.id },
      data: {
        status: TokenStatus.CALLED,
        calledAt: new Date(),
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        faculty: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true,
            facultyProfile: { select: { cabinNumber: true } },
          },
        },
      },
    });

    // Update queue positions
    await prisma.token.updateMany({
      where: {
        facultyId: req.user!.id,
        institutionId: req.tenantId!,
        createdAt: { gte: today },
        status: TokenStatus.WAITING,
        queuePosition: { gt: nextToken.queuePosition || 0 },
      },
      data: {
        queuePosition: { decrement: 1 },
        estimatedWaitMinutes: { decrement: 10 },
      },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: nextToken.studentId,
        institutionId: req.tenantId,
        type: 'TOKEN_CALLED',
        title: 'Your Token Has Been Called!',
        message: `Please proceed to cabin ${calledToken.faculty.facultyProfile?.cabinNumber || 'N/A'}`,
        data: { tokenId: calledToken.id },
      },
    });

    // Socket notifications
    const io = req.app.get('io');
    if (io) {
      // Notify the called student
      io.to(`user:${nextToken.studentId}`).emit('token:called', {
        token: calledToken,
        cabinNumber: calledToken.faculty.facultyProfile?.cabinNumber,
      });

      // Broadcast queue update
      io.to(`queue:${req.user!.id}`).emit('queue:updated', {
        type: 'TOKEN_CALLED',
        token: calledToken,
      });
    }

    logger.info({ tokenId: calledToken.id, facultyId: req.user!.id }, 'Token called');

    res.json({
      success: true,
      data: { currentToken: calledToken },
    });
  } catch (error) {
    logger.error({ error }, 'Call next token error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /queue/start/:tokenId - Mark token as in progress
router.post('/start/:tokenId', requirePermission(Permissions.QUEUE_MANAGE), tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;

    const token = await prisma.token.findFirst({
      where: {
        id: tokenId,
        facultyId: req.user!.id,
        status: TokenStatus.CALLED,
      },
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    const updatedToken = await prisma.token.update({
      where: { id: tokenId },
      data: {
        status: TokenStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updatedToken,
    });
  } catch (error) {
    logger.error({ error }, 'Start token error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /queue/complete/:tokenId - Mark token as completed
router.post('/complete/:tokenId', requirePermission(Permissions.QUEUE_MANAGE), tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;

    const token = await prisma.token.findFirst({
      where: {
        id: tokenId,
        facultyId: req.user!.id,
        status: { in: [TokenStatus.CALLED, TokenStatus.IN_PROGRESS] },
      },
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    const updatedToken = await prisma.token.update({
      where: { id: tokenId },
      data: {
        status: TokenStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Broadcast queue update
    const io = req.app.get('io');
    if (io) {
      io.to(`queue:${req.user!.id}`).emit('queue:updated', {
        type: 'TOKEN_COMPLETED',
        tokenId,
      });
    }

    res.json({
      success: true,
      data: updatedToken,
    });
  } catch (error) {
    logger.error({ error }, 'Complete token error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /queue/skip/:tokenId - Skip a token
router.post('/skip/:tokenId', requirePermission(Permissions.QUEUE_MANAGE), tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const { reason } = req.body;

    const token = await prisma.token.findFirst({
      where: {
        id: tokenId,
        facultyId: req.user!.id,
        status: { in: [TokenStatus.WAITING, TokenStatus.CALLED] },
      },
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    const updatedToken = await prisma.token.update({
      where: { id: tokenId },
      data: {
        status: TokenStatus.SKIPPED,
        skippedAt: new Date(),
        skipReason: reason,
      },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: token.studentId,
        institutionId: req.tenantId,
        type: 'QUEUE_POSITION_UPDATE',
        title: 'Your Token Was Skipped',
        message: reason || 'You were not present when your token was called',
        data: { tokenId },
      },
    });

    res.json({
      success: true,
      data: updatedToken,
    });
  } catch (error) {
    logger.error({ error }, 'Skip token error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// DELETE /queue/leave/:tokenId - Student leaves queue
router.delete('/leave/:tokenId', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;

    const token = await prisma.token.findFirst({
      where: {
        id: tokenId,
        studentId: req.user!.id,
        status: TokenStatus.WAITING,
      },
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    const updatedToken = await prisma.token.update({
      where: { id: tokenId },
      data: {
        status: TokenStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: 'Left by student',
      },
    });

    // Notify faculty
    const io = req.app.get('io');
    if (io) {
      io.to(`faculty:${token.facultyId}`).emit('queue:updated', {
        type: 'STUDENT_LEFT',
        tokenId,
      });
    }

    res.json({
      success: true,
      data: { message: 'Left queue successfully' },
    });
  } catch (error) {
    logger.error({ error }, 'Leave queue error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// GET /queue/my-tokens - Get student's tokens for today
router.get('/my-tokens', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tokens = await prisma.token.findMany({
      where: {
        studentId: req.user!.id,
        createdAt: { gte: today },
      },
      include: {
        faculty: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true,
            facultyProfile: { select: { cabinNumber: true, designation: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    logger.error({ error }, 'Get my tokens error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

export default router;
