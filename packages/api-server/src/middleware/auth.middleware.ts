import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../utils/prisma';
import { ApiErrorCodes, type UserRoleType } from '@campusconnect/shared';
import type { JWTPayload } from '@campusconnect/shared/types';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRoleType;
        institutionId?: string;
        departmentId?: string;
      };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.UNAUTHORIZED,
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.UNAUTHORIZED,
      });
    }

    const decoded = jwt.verify(token, config.jwtAccessSecret) as JWTPayload;
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        role: true,
        institutionId: true,
        departmentId: true,
        isActive: true,
        isSuspended: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.UNAUTHORIZED,
      });
    }

    if (!user.isActive || user.isSuspended) {
      return res.status(403).json({
        success: false,
        error: user.isSuspended ? ApiErrorCodes.ACCOUNT_SUSPENDED : ApiErrorCodes.FORBIDDEN,
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRoleType,
      institutionId: user.institutionId ?? undefined,
      departmentId: user.departmentId ?? undefined,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.TOKEN_EXPIRED,
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.TOKEN_INVALID,
      });
    }

    return res.status(401).json({
      success: false,
      error: ApiErrorCodes.UNAUTHORIZED,
    });
  }
}

// Optional authentication - doesn't fail if no token
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  return authenticate(req, res, next);
}
