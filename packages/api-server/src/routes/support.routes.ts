import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { authenticate } from '../middleware/auth.middleware';
import { tenantMiddleware, getTenantFilter } from '../middleware/tenant.middleware';
import { requirePermission, requireRole } from '../middleware/rbac.middleware';
import {
  createTicketSchema,
  updateTicketSchema,
  ticketMessageSchema,
  cannedResponseSchema,
  knowledgeBaseArticleSchema,
} from '@campusconnect/shared/validation';
import { ApiErrorCodes, Permissions, UserRole, TicketStatus, TicketPriority } from '@campusconnect/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =============================================
// SUPPORT TICKETS
// =============================================

// GET /support/tickets - List tickets
router.get('/tickets', requirePermission(Permissions.SUPPORT_VIEW), async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      assignedTo,
      createdBy,
      search,
      isEscalated,
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const tenantFilter = getTenantFilter(req);

    const where: any = {
      ...tenantFilter,
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedToId = assignedTo;
    if (createdBy) where.createdById = createdBy;
    if (typeof isEscalated === 'boolean') where.isEscalated = isEscalated;

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Non-support agents only see their own tickets
    if (![UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT].includes(req.user!.role)) {
      where.createdById = req.user!.id;
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          institution: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    res.json({
      success: true,
      data: tickets,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get support tickets error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// GET /support/tickets/:id - Get single ticket
router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantFilter = getTenantFilter(req);

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        ...tenantFilter,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        institution: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Non-admins can only view their own tickets
    if (![UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT].includes(req.user!.role) && ticket.createdById !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 4003, message: 'Not authorized to view this ticket' },
      });
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    logger.error({ error }, 'Get support ticket error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /support/tickets - Create support ticket
router.post('/tickets', requirePermission(Permissions.SUPPORT_CREATE), async (req: Request, res: Response) => {
  try {
    const validation = createTicketSchema.safeParse(req.body);

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

    // Generate ticket number
    const lastTicket = await prisma.supportTicket.findFirst({
      where: tenantFilter,
      orderBy: { createdAt: 'desc' },
      select: { ticketNumber: true },
    });

    let ticketNumber = 'TKT-000001';
    if (lastTicket) {
      const lastNumber = parseInt(lastTicket.ticketNumber.split('-')[1], 10);
      ticketNumber = `TKT-${String(lastNumber + 1).padStart(6, '0')}`;
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        ...data,
        ticketNumber,
        createdById: req.user!.id,
        ...tenantFilter,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(
      { userId: req.user!.id, ticketId: ticket.id, ticketNumber },
      'Support ticket created'
    );

    res.status(201).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    logger.error({ error }, 'Create support ticket error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// PUT /support/tickets/:id - Update ticket
router.put('/tickets/:id', requirePermission(Permissions.SUPPORT_EDIT), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateTicketSchema.safeParse(req.body);

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
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, ...tenantFilter },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Only support agents or admins can assign tickets
    if (validation.data.assignedToId && ![UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT, UserRole.INSTITUTION_ADMIN].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 4003, message: 'Not authorized to assign tickets' },
      });
    }

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: validation.data,
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(
      { userId: req.user!.id, ticketId: id },
      'Support ticket updated'
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Update support ticket error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /support/tickets/:id/messages - Add message to ticket
router.post('/tickets/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = ticketMessageSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          ...ApiErrorCodes.VALIDATION_ERROR,
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { message, isInternal } = validation.data;
    const tenantFilter = getTenantFilter(req);

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, ...tenantFilter },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Check permission: user can only add message to their own ticket unless they're support
    if (![UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT].includes(req.user!.role) && ticket.createdById !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 4003, message: 'Not authorized to add message to this ticket' },
      });
    }

    // Only support agents can mark messages as internal
    if (isInternal && ![UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 4008, message: 'Only support agents can mark messages as internal' },
      });
    }

    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: req.user!.id,
        message,
        isInternal: isInternal || false,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Update first response time if this is the first response from support
    if (!ticket.firstResponseAt && ![ticket.createdById, req.user!.id].includes(req.user!.id)) {
      await prisma.supportTicket.update({
        where: { id },
        data: { firstResponseAt: new Date() },
      });
    }

    logger.info(
      { userId: req.user!.id, ticketId: id, messageId: ticketMessage.id },
      'Ticket message added'
    );

    res.status(201).json({
      success: true,
      data: ticketMessage,
    });
  } catch (error) {
    logger.error({ error }, 'Add ticket message error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// =============================================
// CANNED RESPONSES
// =============================================

// GET /support/canned-responses - List canned responses
router.get('/canned-responses', requirePermission(Permissions.SUPPORT_VIEW), async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;
    const tenantFilter = getTenantFilter(req);

    const where: any = {
      ...tenantFilter,
      // Platform-wide responses have null institutionId
      OR: [
        tenantFilter,
        { institutionId: null },
      ],
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const responses = await prisma.cannedResponse.findMany({
      where,
      orderBy: { usageCount: 'desc' },
    });

    res.json({
      success: true,
      data: responses,
    });
  } catch (error) {
    logger.error({ error }, 'Get canned responses error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /support/canned-responses - Create canned response
router.post('/canned-responses', requirePermission(Permissions.SUPPORT_EDIT), async (req: Request, res: Response) => {
  try {
    const validation = cannedResponseSchema.safeParse(req.body);

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

    // Only super admin can create platform-wide responses
    if (data.institutionId === null && req.user!.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        error: { code: 4003, message: 'Only super admins can create platform-wide responses' },
      });
    }

    // Institution admins can create for their own institution or institution-wide
    if (req.user!.role === UserRole.INSTITUTION_ADMIN && data.institutionId) {
      if (data.institutionId !== req.user!.institutionId) {
        return res.status(403).json({
          success: false,
          error: { code: 4003, message: 'Cannot create response for another institution' },
        });
      }
    }

    const response = await prisma.cannedResponse.create({
      data: {
        ...data,
        ...(data.institutionId ? tenantFilter : {}),
      },
    });

    logger.info(
      { userId: req.user!.id, responseId: response.id },
      'Canned response created'
    );

    res.status(201).json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error({ error }, 'Create canned response error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// PUT /support/canned-responses/:id - Update canned response
router.put('/canned-responses/:id', requirePermission(Permissions.SUPPORT_EDIT), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = cannedResponseSchema.safeParse(req.body);

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
    const existing = await prisma.cannedResponse.findFirst({
      where: { id, ...tenantFilter },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Only creator or super admin can update
    if (existing.institutionId !== null && req.user!.role !== UserRole.SUPER_ADMIN && existing.institutionId !== req.user!.institutionId) {
      return res.status(403).json({
        success: false,
        error: { code: 4003, message: 'Not authorized to update this response' },
      });
    }

    const updated = await prisma.cannedResponse.update({
      where: { id },
      data: validation.data,
    });

    logger.info(
      { userId: req.user!.id, responseId: id },
      'Canned response updated'
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Update canned response error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /support/canned-responses/:id/use - Increment usage count
router.post('/canned-responses/:id/use', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantFilter = getTenantFilter(req);

    const response = await prisma.cannedResponse.findFirst({
      where: { id, ...tenantFilter },
    });

    if (!response) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    await prisma.cannedResponse.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });

    res.json({
      success: true,
      data: { message: 'Usage count incremented' },
    });
  } catch (error) {
    logger.error({ error }, 'Increment canned response usage error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// =============================================
// KNOWLEDGE BASE
// =============================================

// GET /support/knowledge-base - List published articles
router.get('/knowledge-base', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, category, search, tag } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const tenantFilter = getTenantFilter(req);

    const where: any = {
      isPublished: true,
      ...tenantFilter,
      OR: [
        tenantFilter,
        { institutionId: null }, // Include platform-wide articles
      ],
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const [articles, total] = await Promise.all([
      prisma.knowledgeBaseArticle.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { isPinned: 'desc',publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          category: true,
          tags: true,
          author: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          viewCount: true,
          helpfulCount: true,
          publishedAt: true,
        },
      }),
      prisma.knowledgeBaseArticle.count({ where }),
    ]);

    res.json({
      success: true,
      data: articles,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get knowledge base error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// GET /support/knowledge-base/:slug - Get single article
router.get('/knowledge-base/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const tenantFilter = getTenantFilter(req);

    const article = await prisma.knowledgeBaseArticle.findFirst({
      where: {
        slug,
        isPublished: true,
        ...tenantFilter,
        OR: [
          tenantFilter,
          { institutionId: null },
        ],
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Increment view count
    await prisma.knowledgeBaseArticle.update({
      where: { id: article.id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    logger.error({ error }, 'Get knowledge base article error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /support/knowledge-base - Create article (requires permission)
router.post('/knowledge-base', requirePermission(Permissions.CONTENT_MANAGE), async (req: Request, res: Response) => {
  try {
    const validation = knowledgeBaseArticleSchema.safeParse(req.body);

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

    // Generate slug from title
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        ...data,
        slug,
        authorId: req.user!.id,
        ...(data.institutionId ? tenantFilter : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(
      { userId: req.user!.id, articleId: article.id },
      'Knowledge base article created'
    );

    res.status(201).json({
      success: true,
      data: article,
    });
  } catch (error) {
    logger.error({ error }, 'Create knowledge base article error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// PUT /support/knowledge-base/:id - Update article
router.put('/knowledge-base/:id', requirePermission(Permissions.CONTENT_MANAGE), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = knowledgeBaseArticleSchema.safeParse(req.body);

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
    const article = await prisma.knowledgeBaseArticle.findFirst({
      where: { id, ...tenantFilter },
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    // Only author or super admin can update
    if (article.authorId !== req.user!.id && req.user!.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        error: { code: 4003, message: 'Not authorized to update this article' },
      });
    }

    const updated = await prisma.knowledgeBaseArticle.update({
      where: { id },
      data: {
        ...validation.data,
        ...(validation.data.published && !article.publishedAt
          ? { publishedAt: new Date() }
          : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(
      { userId: req.user!.id, articleId: id },
      'Knowledge base article updated'
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Update knowledge base article error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /support/knowledge-base/:id/helpful - Mark article as helpful
router.post('/knowledge-base/:id/helpful', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: { id },
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    await prisma.knowledgeBaseArticle.update({
      where: { id },
      data: {
        helpfulCount: {
          increment: 1,
        },
      },
    });

    res.json({
      success: true,
      data: { message: 'Feedback recorded' },
    });
  } catch (error) {
    logger.error({ error }, 'Mark article helpful error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

// POST /support/knowledge-base/:id/not-helpful - Mark article as not helpful
router.post('/knowledge-base/:id/not-helpful', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: { id },
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        error: ApiErrorCodes.NOT_FOUND,
      });
    }

    await prisma.knowledgeBaseArticle.update({
      where: { id },
      data: {
        notHelpfulCount: {
          increment: 1,
        },
      },
    });

    res.json({
      success: true,
      data: { message: 'Feedback recorded' },
    });
  } catch (error) {
    logger.error({ error }, 'Mark article not helpful error');
    res.status(500).json({
      success: false,
      error: ApiErrorCodes.INTERNAL_ERROR,
    });
  }
});

export default router;
