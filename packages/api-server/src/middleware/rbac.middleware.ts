import { Request, Response, NextFunction } from 'express';
import { UserRole, RolePermissions, type PermissionType, type UserRoleType, ApiErrorCodes } from '@campusconnect/shared';

// Check if user has required role(s)
export function requireRole(...allowedRoles: UserRoleType[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.UNAUTHORIZED,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: ApiErrorCodes.FORBIDDEN,
      });
    }

    next();
  };
}

// Check if user has required permission(s)
export function requirePermission(...requiredPermissions: PermissionType[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.UNAUTHORIZED,
      });
    }

    const userPermissions = RolePermissions[req.user.role] || [];
    const hasAllPermissions = requiredPermissions.every(
      permission => userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        error: ApiErrorCodes.FORBIDDEN,
      });
    }

    next();
  };
}

// Check if user has any of the required permissions
export function requireAnyPermission(...requiredPermissions: PermissionType[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.UNAUTHORIZED,
      });
    }

    const userPermissions = RolePermissions[req.user.role] || [];
    const hasAnyPermission = requiredPermissions.some(
      permission => userPermissions.includes(permission)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        success: false,
        error: ApiErrorCodes.FORBIDDEN,
      });
    }

    next();
  };
}

// Check if user is admin (any admin level)
export function requireAdmin() {
  return requireRole(
    UserRole.DEPARTMENT_ADMIN as UserRoleType,
    UserRole.INSTITUTION_ADMIN as UserRoleType,
    UserRole.SUPER_ADMIN as UserRoleType
  );
}

// Check if user is super admin
export function requireSuperAdmin() {
  return requireRole(UserRole.SUPER_ADMIN as UserRoleType);
}

// Check if user belongs to same institution
export function requireSameInstitution() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: ApiErrorCodes.UNAUTHORIZED,
      });
    }

    // Super admins can access any institution
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    const targetInstitutionId = 
      req.params.institutionId || 
      req.body?.institutionId || 
      req.query?.institutionId;

    if (targetInstitutionId && req.user.institutionId !== targetInstitutionId) {
      return res.status(403).json({
        success: false,
        error: ApiErrorCodes.FORBIDDEN,
      });
    }

    next();
  };
}
