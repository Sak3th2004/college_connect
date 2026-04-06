import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { authenticate } from '../middleware/auth.middleware';
import { paginationSchema } from '@campusconnect/shared/validation';
import { ApiErrorCodes } from '@campusconnect/shared';

const router = Router();

router.use(authenticate);

// GET /notifications - Get user's notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const validation = paginationSchema.safeParse(req.query);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: ApiErrorCodes.VALIDATION_ERROR,
      });
    }

    const { page, limit } = validation.data;
    const skip = (page - 1) * limit;

    const where = { userId: req.user!.id };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get notifications error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// PUT /notifications/:id/read - Mark notification as read
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Mark notification read error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// PUT /notifications/read-all - Mark all as read
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (error) {
    logger.error({ error }, 'Mark all notifications read error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// DELETE /notifications/:id - Delete notification
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    await prisma.notification.delete({ where: { id } });

    res.json({
      success: true,
      data: { message: 'Notification deleted' },
    });
  } catch (error) {
    logger.error({ error }, 'Delete notification error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

export default router;
