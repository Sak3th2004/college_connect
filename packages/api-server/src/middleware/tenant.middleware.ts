import { Request, Response, NextFunction } from 'express';
import { UserRole, ApiErrorCodes } from '@campusconnect/shared';

// Middleware to ensure tenant isolation
// All queries should be scoped to the user's institution
export function tenantMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.UNAUTHORIZED,
      });
    }

    // Super admins can access all tenants
    if (req.user.role === UserRole.SUPER_ADMIN) {
      // For super admins, allow optional institutionId override from query/body
      const targetInstitutionId = 
        req.query.institutionId as string || 
        req.body?.institutionId;
      
      if (targetInstitutionId) {
        req.tenantId = targetInstitutionId;
      }
      return next();
    }

    // Non-super admins must have an institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 1009,
          message: 'User not associated with any institution',
        },
      });
    }

    // Set tenant context for all queries
    req.tenantId = req.user.institutionId;
    next();
  };
}

// Type extension for tenant ID
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

// Helper to get tenant filter for Prisma queries
export function getTenantFilter(req: Request) {
  if (req.tenantId) {
    return { institutionId: req.tenantId };
  }
  return {};
}
