// =============================================
// BASE TYPES
// =============================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================
// USER TYPES
// =============================================

import type {
  UserRoleType,
  FacultyStatusType,
  AppointmentStatusType,
  TokenStatusType,
  TicketStatusType,
  TicketPriorityType,
  InvitationStatusType,
  OnboardingStatusType,
  SubscriptionStatusType,
  NotificationTypeType,
  AnnouncementScopeType,
} from '../constants';

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: UserRoleType;
  isActive: boolean;
  isEmailVerified: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  twoFactorEnabled: boolean;
  institutionId?: string;
  departmentId?: string;
  lastLoginAt?: Date;
}

export interface StudentProfile extends BaseEntity {
  userId: string;
  user?: User;
  rollNumber?: string;
  admissionYear?: number;
  program?: string;
  semester?: number;
  batch?: string;
}

export interface FacultyProfile extends BaseEntity {
  userId: string;
  user?: User;
  employeeId?: string;
  designation?: string;
  specialization?: string;
  cabinNumber?: string;
  building?: string;
  floor?: string;
  currentStatus: FacultyStatusType;
  statusMessage?: string;
  statusUpdatedAt?: Date;
  autoStatusEnabled: boolean;
  isAcceptingAppointments: boolean;
  maxDailyAppointments: number;
  appointmentSlotDuration: number;
}

// =============================================
// INSTITUTION TYPES
// =============================================

export interface Institution extends BaseEntity {
  name: string;
  code: string;
  slug: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  timezone: string;
  workingDays: number[];
  workingHoursStart: string;
  workingHoursEnd: string;
  maxAppointmentsPerStudent: number;
  tokenAutoExpireMinutes: number;
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  onboardingStatus: OnboardingStatusType;
}

export interface Department extends BaseEntity {
  institutionId: string;
  institution?: Institution;
  name: string;
  code: string;
  description?: string;
  headOfDepartment?: string;
  email?: string;
  phone?: string;
  building?: string;
  floor?: string;
  isActive: boolean;
}

// =============================================
// APPOINTMENT TYPES
// =============================================

export interface Appointment extends BaseEntity {
  institutionId: string;
  studentId: string;
  student?: User;
  facultyId: string;
  faculty?: User;
  departmentId?: string;
  department?: Department;
  title: string;
  purpose?: string;
  requestedDate: Date;
  requestedStartTime: string;
  requestedEndTime?: string;
  confirmedDate?: Date;
  confirmedStartTime?: string;
  confirmedEndTime?: string;
  status: AppointmentStatusType;
  priority: TicketPriorityType;
  rejectionReason?: string;
  cancellationReason?: string;
  rescheduledFrom?: string;
  completedAt?: Date;
  facultyNotes?: string;
  studentNotes?: string;
  rating?: number;
  feedback?: string;
}

export interface AppointmentDocument extends BaseEntity {
  appointmentId: string;
  appointment?: Appointment;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  description?: string;
  aiAnalysis?: string;
}

// =============================================
// TOKEN/QUEUE TYPES
// =============================================

export interface Token extends BaseEntity {
  institutionId: string;
  facultyId: string;
  faculty?: User;
  studentId: string;
  student?: User;
  appointmentId?: string;
  appointment?: Appointment;
  tokenNumber: number;
  tokenDisplay: string;
  status: TokenStatusType;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  calledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  skippedAt?: Date;
  cancelledAt?: Date;
  skipReason?: string;
  cancelReason?: string;
}

// =============================================
// SUPPORT TYPES
// =============================================

export interface SupportTicket extends BaseEntity {
  institutionId?: string;
  institution?: Institution;
  createdBy: string;
  creator?: User;
  assignedTo?: string;
  agent?: User;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  status: TicketStatusType;
  priority: TicketPriorityType;
  isEscalated: boolean;
  escalatedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  reopenedAt?: Date;
  firstResponseAt?: Date;
  satisfactionRating?: number;
  satisfactionFeedback?: string;
}

export interface TicketMessage extends BaseEntity {
  ticketId: string;
  ticket?: SupportTicket;
  senderId: string;
  sender?: User;
  message: string;
  isInternal: boolean;
  isAutoResponse: boolean;
}

export interface KnowledgeBaseArticle extends BaseEntity {
  institutionId?: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category: string;
  tags: string[];
  authorId: string;
  author?: User;
  isPublished: boolean;
  publishedAt?: Date;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
}

// =============================================
// INVITATION TYPES
// =============================================

export interface Invitation extends BaseEntity {
  institutionId: string;
  institution?: Institution;
  email: string;
  role: UserRoleType;
  departmentId?: string;
  department?: Department;
  invitedBy: string;
  inviter?: User;
  token: string;
  status: InvitationStatusType;
  expiresAt: Date;
  acceptedAt?: Date;
}

// =============================================
// SUBSCRIPTION/BILLING TYPES
// =============================================

export interface Subscription extends BaseEntity {
  institutionId: string;
  institution?: Institution;
  planType: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  status: SubscriptionStatusType;
  billingCycle: 'MONTHLY' | 'YEARLY';
  amount: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  paymentGateway?: string;
  gatewaySubscriptionId?: string;
  gatewayCustomerId?: string;
}

export interface Invoice extends BaseEntity {
  institutionId: string;
  institution?: Institution;
  subscriptionId: string;
  subscription?: Subscription;
  invoiceNumber: string;
  amount: number;
  tax: number;
  total: number;
  currency: string;
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
  dueDate: Date;
  paidAt?: Date;
  paymentMethod?: string;
  gatewayPaymentId?: string;
  pdfUrl?: string;
}

// =============================================
// NOTIFICATION TYPES
// =============================================

export interface Notification extends BaseEntity {
  userId: string;
  user?: User;
  institutionId?: string;
  type: NotificationTypeType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  expiresAt?: Date;
}

// =============================================
// ANNOUNCEMENT TYPES
// =============================================

export interface Announcement extends BaseEntity {
  institutionId?: string;
  institution?: Institution;
  departmentId?: string;
  department?: Department;
  authorId: string;
  author?: User;
  title: string;
  content: string;
  scope: AnnouncementScopeType;
  isPublished: boolean;
  publishedAt?: Date;
  expiresAt?: Date;
  isPinned: boolean;
}

// =============================================
// AUDIT LOG TYPES
// =============================================

export interface AuditLog extends BaseEntity {
  institutionId?: string;
  userId?: string;
  user?: User;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

// =============================================
// SCHEDULE TYPES
// =============================================

export interface FacultySchedule extends BaseEntity {
  facultyId: string;
  faculty?: FacultyProfile;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  scheduleType: 'OFFICE_HOURS' | 'CLASS' | 'MEETING' | 'UNAVAILABLE';
  label?: string;
  location?: string;
  isRecurring: boolean;
}

export interface FacultyLeave extends BaseEntity {
  facultyId: string;
  faculty?: FacultyProfile;
  startDate: Date;
  endDate: Date;
  leaveType: 'CASUAL' | 'SICK' | 'VACATION' | 'CONFERENCE' | 'OTHER';
  reason?: string;
  isApproved: boolean;
  approvedBy?: string;
}

// =============================================
// API TYPES
// =============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  institutionId?: string;
}

// =============================================
// AUTH TYPES
// =============================================

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRoleType;
  institutionCode?: string;
  invitationToken?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRoleType;
  institutionId?: string;
  departmentId?: string;
  permissions: string[];
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRoleType;
  institutionId?: string;
  departmentId?: string;
  iat: number;
  exp: number;
}

// =============================================
// SOCKET EVENT PAYLOADS
// =============================================

export interface FacultyStatusPayload {
  facultyId: string;
  status: FacultyStatusType;
  message?: string;
  updatedAt: Date;
}

export interface QueueUpdatePayload {
  facultyId: string;
  queue: {
    tokenId: string;
    tokenNumber: number;
    position: number;
    status: TokenStatusType;
    studentName: string;
  }[];
  currentToken?: string;
}

export interface TokenCalledPayload {
  tokenId: string;
  tokenNumber: number;
  facultyId: string;
  facultyName: string;
  cabinNumber?: string;
}

export interface NotificationPayload {
  id: string;
  type: NotificationTypeType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: Date;
}
