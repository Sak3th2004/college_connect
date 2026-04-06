// =============================================
// USER ROLES
// =============================================

export const UserRole = {
  STUDENT: 'STUDENT',
  FACULTY: 'FACULTY',
  DEPARTMENT_ADMIN: 'DEPARTMENT_ADMIN',
  INSTITUTION_ADMIN: 'INSTITUTION_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// =============================================
// FACULTY STATUS
// =============================================

export const FacultyStatus = {
  FREE: 'FREE',
  IN_MEETING: 'IN_MEETING',
  IN_CLASS: 'IN_CLASS',
  ON_LEAVE: 'ON_LEAVE',
  DO_NOT_DISTURB: 'DO_NOT_DISTURB',
  BUSY: 'BUSY',
  OFFLINE: 'OFFLINE',
} as const;

export type FacultyStatusType = (typeof FacultyStatus)[keyof typeof FacultyStatus];

export const FacultyStatusLabels: Record<FacultyStatusType, string> = {
  FREE: 'Available',
  IN_MEETING: 'In Meeting',
  IN_CLASS: 'In Class',
  ON_LEAVE: 'On Leave',
  DO_NOT_DISTURB: 'Do Not Disturb',
  BUSY: 'Busy',
  OFFLINE: 'Offline',
};

export const FacultyStatusColors: Record<FacultyStatusType, string> = {
  FREE: '#22c55e', // green
  IN_MEETING: '#f59e0b', // amber
  IN_CLASS: '#3b82f6', // blue
  ON_LEAVE: '#6b7280', // gray
  DO_NOT_DISTURB: '#ef4444', // red
  BUSY: '#f97316', // orange
  OFFLINE: '#9ca3af', // gray-400
};

// =============================================
// APPOINTMENT STATUS
// =============================================

export const AppointmentStatus = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  RESCHEDULED: 'RESCHEDULED',
} as const;

export type AppointmentStatusType = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

// =============================================
// TOKEN/QUEUE STATUS
// =============================================

export const TokenStatus = {
  WAITING: 'WAITING',
  CALLED: 'CALLED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type TokenStatusType = (typeof TokenStatus)[keyof typeof TokenStatus];

// =============================================
// TICKET STATUS
// =============================================

export const TicketStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_ON_USER: 'WAITING_ON_USER',
  WAITING_ON_AGENT: 'WAITING_ON_AGENT',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  REOPENED: 'REOPENED',
} as const;

export type TicketStatusType = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type TicketPriorityType = (typeof TicketPriority)[keyof typeof TicketPriority];

export const TicketCategories = [
  'Account Issues',
  'Appointment Problems',
  'Faculty Status',
  'Queue/Token Issues',
  'Technical Issues',
  'Billing Questions',
  'Feature Request',
  'Other',
] as const;

// =============================================
// INVITATION STATUS
// =============================================

export const InvitationStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;

export type InvitationStatusType = (typeof InvitationStatus)[keyof typeof InvitationStatus];

// =============================================
// ONBOARDING STATUS
// =============================================

export const OnboardingStatus = {
  STARTED: 'STARTED',
  INSTITUTION_CREATED: 'INSTITUTION_CREATED',
  DEPARTMENTS_ADDED: 'DEPARTMENTS_ADDED',
  FACULTY_INVITED: 'FACULTY_INVITED',
  STUDENTS_INVITED: 'STUDENTS_INVITED',
  CONFIGURED: 'CONFIGURED',
  COMPLETED: 'COMPLETED',
} as const;

export type OnboardingStatusType = (typeof OnboardingStatus)[keyof typeof OnboardingStatus];

// =============================================
// SUBSCRIPTION STATUS
// =============================================

export const SubscriptionStatus = {
  TRIALING: 'TRIALING',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED',
} as const;

export type SubscriptionStatusType = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

// =============================================
// NOTIFICATION TYPES
// =============================================

export const NotificationType = {
  APPOINTMENT_REQUESTED: 'APPOINTMENT_REQUESTED',
  APPOINTMENT_APPROVED: 'APPOINTMENT_APPROVED',
  APPOINTMENT_REJECTED: 'APPOINTMENT_REJECTED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
  TOKEN_CALLED: 'TOKEN_CALLED',
  QUEUE_POSITION_UPDATE: 'QUEUE_POSITION_UPDATE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  REMINDER: 'REMINDER',
  INVITATION: 'INVITATION',
  TICKET_UPDATE: 'TICKET_UPDATE',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  BILLING: 'BILLING',
  SYSTEM: 'SYSTEM',
} as const;

export type NotificationTypeType = (typeof NotificationType)[keyof typeof NotificationType];

// =============================================
// ANNOUNCEMENT SCOPE
// =============================================

export const AnnouncementScope = {
  PLATFORM: 'PLATFORM',
  INSTITUTION: 'INSTITUTION',
  DEPARTMENT: 'DEPARTMENT',
} as const;

export type AnnouncementScopeType = (typeof AnnouncementScope)[keyof typeof AnnouncementScope];

// =============================================
// PERMISSIONS
// =============================================

export const Permissions = {
  // User Management
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_INVITE: 'user:invite',
  USER_SUSPEND: 'user:suspend',

  // Faculty Management
  FACULTY_VIEW: 'faculty:view',
  FACULTY_CREATE: 'faculty:create',
  FACULTY_UPDATE: 'faculty:update',
  FACULTY_DELETE: 'faculty:delete',
  FACULTY_STATUS_UPDATE: 'faculty:status:update',

  // Appointment Management
  APPOINTMENT_VIEW_OWN: 'appointment:view:own',
  APPOINTMENT_VIEW_ALL: 'appointment:view:all',
  APPOINTMENT_CREATE: 'appointment:create',
  APPOINTMENT_APPROVE: 'appointment:approve',
  APPOINTMENT_CANCEL: 'appointment:cancel',

  // Queue Management
  QUEUE_VIEW: 'queue:view',
  QUEUE_JOIN: 'queue:join',
  QUEUE_MANAGE: 'queue:manage',
  QUEUE_CALL_NEXT: 'queue:call:next',

  // Department Management
  DEPARTMENT_VIEW: 'department:view',
  DEPARTMENT_CREATE: 'department:create',
  DEPARTMENT_UPDATE: 'department:update',
  DEPARTMENT_DELETE: 'department:delete',

  // Institution Management
  INSTITUTION_VIEW: 'institution:view',
  INSTITUTION_UPDATE: 'institution:update',
  INSTITUTION_MANAGE: 'institution:manage',

  // Support
  TICKET_CREATE: 'ticket:create',
  TICKET_VIEW_OWN: 'ticket:view:own',
  TICKET_VIEW_ALL: 'ticket:view:all',
  TICKET_RESOLVE: 'ticket:resolve',
  KNOWLEDGE_BASE_MANAGE: 'kb:manage',

  // Analytics
  ANALYTICS_VIEW_OWN: 'analytics:view:own',
  ANALYTICS_VIEW_DEPARTMENT: 'analytics:view:department',
  ANALYTICS_VIEW_INSTITUTION: 'analytics:view:institution',
  ANALYTICS_VIEW_PLATFORM: 'analytics:view:platform',

  // Billing
  BILLING_VIEW: 'billing:view',
  BILLING_MANAGE: 'billing:manage',

  // Audit Logs
  AUDIT_VIEW: 'audit:view',
  AUDIT_EXPORT: 'audit:export',

  // System
  SYSTEM_SETTINGS: 'system:settings',
  FEATURE_FLAGS: 'feature:flags',
  PLATFORM_MANAGE: 'platform:manage',
} as const;

export type PermissionType = (typeof Permissions)[keyof typeof Permissions];

// Role-Permission Mapping
export const RolePermissions: Record<UserRoleType, PermissionType[]> = {
  STUDENT: [
    Permissions.FACULTY_VIEW,
    Permissions.APPOINTMENT_VIEW_OWN,
    Permissions.APPOINTMENT_CREATE,
    Permissions.APPOINTMENT_CANCEL,
    Permissions.QUEUE_VIEW,
    Permissions.QUEUE_JOIN,
    Permissions.TICKET_CREATE,
    Permissions.TICKET_VIEW_OWN,
  ],
  FACULTY: [
    Permissions.FACULTY_VIEW,
    Permissions.FACULTY_STATUS_UPDATE,
    Permissions.APPOINTMENT_VIEW_OWN,
    Permissions.APPOINTMENT_APPROVE,
    Permissions.APPOINTMENT_CANCEL,
    Permissions.QUEUE_VIEW,
    Permissions.QUEUE_MANAGE,
    Permissions.QUEUE_CALL_NEXT,
    Permissions.TICKET_CREATE,
    Permissions.TICKET_VIEW_OWN,
    Permissions.ANALYTICS_VIEW_OWN,
  ],
  DEPARTMENT_ADMIN: [
    Permissions.USER_VIEW,
    Permissions.USER_CREATE,
    Permissions.USER_UPDATE,
    Permissions.USER_INVITE,
    Permissions.FACULTY_VIEW,
    Permissions.FACULTY_CREATE,
    Permissions.FACULTY_UPDATE,
    Permissions.APPOINTMENT_VIEW_ALL,
    Permissions.QUEUE_VIEW,
    Permissions.QUEUE_MANAGE,
    Permissions.DEPARTMENT_VIEW,
    Permissions.DEPARTMENT_UPDATE,
    Permissions.TICKET_CREATE,
    Permissions.TICKET_VIEW_ALL,
    Permissions.TICKET_RESOLVE,
    Permissions.ANALYTICS_VIEW_DEPARTMENT,
  ],
  INSTITUTION_ADMIN: [
    Permissions.USER_VIEW,
    Permissions.USER_CREATE,
    Permissions.USER_UPDATE,
    Permissions.USER_DELETE,
    Permissions.USER_INVITE,
    Permissions.USER_SUSPEND,
    Permissions.FACULTY_VIEW,
    Permissions.FACULTY_CREATE,
    Permissions.FACULTY_UPDATE,
    Permissions.FACULTY_DELETE,
    Permissions.APPOINTMENT_VIEW_ALL,
    Permissions.QUEUE_VIEW,
    Permissions.QUEUE_MANAGE,
    Permissions.DEPARTMENT_VIEW,
    Permissions.DEPARTMENT_CREATE,
    Permissions.DEPARTMENT_UPDATE,
    Permissions.DEPARTMENT_DELETE,
    Permissions.INSTITUTION_VIEW,
    Permissions.INSTITUTION_UPDATE,
    Permissions.INSTITUTION_MANAGE,
    Permissions.TICKET_CREATE,
    Permissions.TICKET_VIEW_ALL,
    Permissions.TICKET_RESOLVE,
    Permissions.KNOWLEDGE_BASE_MANAGE,
    Permissions.ANALYTICS_VIEW_INSTITUTION,
    Permissions.BILLING_VIEW,
    Permissions.BILLING_MANAGE,
    Permissions.AUDIT_VIEW,
    Permissions.AUDIT_EXPORT,
  ],
  SUPPORT_AGENT: [
    Permissions.USER_VIEW,
    Permissions.TICKET_VIEW_ALL,
    Permissions.TICKET_RESOLVE,
    Permissions.KNOWLEDGE_BASE_MANAGE,
  ],
  SUPER_ADMIN: Object.values(Permissions),
};

// =============================================
// PRICING TIERS
// =============================================

export const PricingTiers = {
  FREE: {
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    maxFaculty: 10,
    maxStudents: 100,
    maxDepartments: 3,
    features: [
      'Basic faculty status',
      'Simple appointments',
      'Email support',
    ],
  },
  STARTER: {
    name: 'Starter',
    priceMonthly: 2999, // INR
    priceYearly: 29990,
    maxFaculty: 50,
    maxStudents: 500,
    maxDepartments: 10,
    features: [
      'Everything in Free',
      'Real-time queue',
      'Basic analytics',
      'Priority support',
    ],
  },
  PRO: {
    name: 'Pro',
    priceMonthly: 9999,
    priceYearly: 99990,
    maxFaculty: 200,
    maxStudents: 5000,
    maxDepartments: 50,
    features: [
      'Everything in Starter',
      'AI scheduling',
      'Advanced analytics',
      'Custom branding',
      'API access',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    priceMonthly: null, // Custom
    priceYearly: null,
    maxFaculty: null,
    maxStudents: null,
    maxDepartments: null,
    features: [
      'Everything in Pro',
      'Unlimited users',
      'SSO/LDAP',
      'Dedicated support',
      'SLA guarantee',
      'On-premise option',
    ],
  },
} as const;

// =============================================
// CONFIGURATION DEFAULTS
// =============================================

export const DefaultConfig = {
  timezone: 'Asia/Kolkata',
  workingDays: [1, 2, 3, 4, 5], // Mon-Fri
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  maxAppointmentsPerStudent: 3, // Per day
  tokenAutoExpireMinutes: 30,
  appointmentSlotDuration: 15, // minutes
  maxQueueSize: 50,
  invitationExpiryDays: 7,
  passwordMinLength: 8,
  sessionMaxConcurrent: 3,
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  rateLimitRequests: 100,
  rateLimitWindow: 60000, // 1 minute in ms
} as const;

// =============================================
// SOCKET EVENTS
// =============================================

export const SocketEvents = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Faculty Status
  FACULTY_STATUS_UPDATE: 'faculty:status:update',
  FACULTY_STATUS_CHANGED: 'faculty:status:changed',
  
  // Queue
  QUEUE_JOIN: 'queue:join',
  QUEUE_LEAVE: 'queue:leave',
  QUEUE_UPDATED: 'queue:updated',
  TOKEN_CALLED: 'token:called',
  TOKEN_COMPLETED: 'token:completed',
  
  // Appointments
  APPOINTMENT_CREATED: 'appointment:created',
  APPOINTMENT_UPDATED: 'appointment:updated',
  
  // Notifications
  NOTIFICATION: 'notification',
  NOTIFICATION_READ: 'notification:read',
  
  // Support Chat
  SUPPORT_MESSAGE: 'support:message',
  SUPPORT_TYPING: 'support:typing',
  
  // Presence
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
} as const;

// =============================================
// API RESPONSE CODES
// =============================================

export const ApiErrorCodes = {
  // Auth Errors (1xxx)
  INVALID_CREDENTIALS: { code: 1001, message: 'Invalid email or password' },
  EMAIL_NOT_VERIFIED: { code: 1002, message: 'Email not verified' },
  ACCOUNT_SUSPENDED: { code: 1003, message: 'Account has been suspended' },
  ACCOUNT_LOCKED: { code: 1004, message: 'Account temporarily locked' },
  TOKEN_EXPIRED: { code: 1005, message: 'Token has expired' },
  TOKEN_INVALID: { code: 1006, message: 'Invalid token' },
  UNAUTHORIZED: { code: 1007, message: 'Unauthorized' },
  FORBIDDEN: { code: 1008, message: 'Access denied' },
  
  // Validation Errors (2xxx)
  VALIDATION_ERROR: { code: 2001, message: 'Validation error' },
  INVALID_INPUT: { code: 2002, message: 'Invalid input' },
  
  // Resource Errors (3xxx)
  NOT_FOUND: { code: 3001, message: 'Resource not found' },
  ALREADY_EXISTS: { code: 3002, message: 'Resource already exists' },
  CONFLICT: { code: 3003, message: 'Resource conflict' },
  
  // Rate Limiting (4xxx)
  RATE_LIMITED: { code: 4001, message: 'Too many requests' },
  
  // Server Errors (5xxx)
  INTERNAL_ERROR: { code: 5001, message: 'Internal server error' },
  SERVICE_UNAVAILABLE: { code: 5002, message: 'Service temporarily unavailable' },
} as const;
