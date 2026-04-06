import { z } from 'zod';
import { UserRole, FacultyStatus, AppointmentStatus, TicketPriority, TicketCategories } from '../constants';

// =============================================
// COMMON SCHEMAS
// =============================================

export const emailSchema = z.string().email('Invalid email address').toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password too long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number')
  .optional();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// =============================================
// AUTH SCHEMAS
// =============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required').max(50).trim(),
  lastName: z.string().min(1, 'Last name is required').max(50).trim(),
  role: z.enum([UserRole.STUDENT, UserRole.FACULTY]),
  institutionCode: z.string().optional(),
  invitationToken: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const setup2FASchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

// =============================================
// USER SCHEMAS
// =============================================

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
  phone: phoneSchema,
  avatar: z.string().url().optional().nullable(),
});

export const createUserSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1, 'First name is required').max(50).trim(),
  lastName: z.string().min(1, 'Last name is required').max(50).trim(),
  role: z.nativeEnum(UserRole),
  departmentId: z.string().cuid().optional(),
  phone: phoneSchema,
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
  phone: phoneSchema,
  role: z.nativeEnum(UserRole).optional(),
  departmentId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().optional(),
  isSuspended: z.boolean().optional(),
  suspensionReason: z.string().max(500).optional().nullable(),
});

// =============================================
// STUDENT PROFILE SCHEMAS
// =============================================

export const updateStudentProfileSchema = z.object({
  rollNumber: z.string().max(50).optional(),
  admissionYear: z.number().int().min(2000).max(2100).optional(),
  program: z.string().max(100).optional(),
  semester: z.number().int().min(1).max(12).optional(),
  batch: z.string().max(50).optional(),
});

// =============================================
// FACULTY PROFILE SCHEMAS
// =============================================

export const updateFacultyProfileSchema = z.object({
  employeeId: z.string().max(50).optional(),
  designation: z.string().max(100).optional(),
  specialization: z.string().max(200).optional(),
  cabinNumber: z.string().max(50).optional(),
  building: z.string().max(100).optional(),
  floor: z.string().max(20).optional(),
  autoStatusEnabled: z.boolean().optional(),
  isAcceptingAppointments: z.boolean().optional(),
  maxDailyAppointments: z.number().int().min(1).max(50).optional(),
  appointmentSlotDuration: z.number().int().min(5).max(120).optional(),
});

export const updateFacultyStatusSchema = z.object({
  status: z.nativeEnum(FacultyStatus),
  message: z.string().max(200).optional(),
  duration: z.number().int().min(1).max(480).optional(), // Auto-revert after N minutes
});

// =============================================
// ONBOARDING SCHEMAS
// =============================================

export const institutionSetupSchema = z.object({
  name: z.string().min(2, 'Institution name is required').max(200).trim(),
  code: z.string().min(2).max(20).toUpperCase().regex(/^[A-Z0-9-]+$/, 'Code can only contain letters, numbers, and hyphens'),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).default('India'),
  pincode: z.string().max(10).optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
  website: z.string().url().optional(),
});

export const departmentSetupSchema = z.object({
  name: z.string().min(2, 'Department name is required').max(200).trim(),
  code: z.string().min(2).max(20).toUpperCase(),
  description: z.string().max(500).optional(),
  headOfDepartment: z.string().max(100).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  building: z.string().max(100).optional(),
  floor: z.string().max(20).optional(),
});

export const bulkInviteSchema = z.object({
  invites: z.array(z.object({
    email: emailSchema,
    role: z.enum([UserRole.FACULTY, UserRole.STUDENT, UserRole.DEPARTMENT_ADMIN]),
    departmentId: z.string().cuid().optional(),
    firstName: z.string().max(50).optional(),
    lastName: z.string().max(50).optional(),
  })).min(1, 'At least one invite is required').max(500, 'Maximum 500 invites per batch'),
});

export const brandingConfigSchema = z.object({
  logo: z.string().url().optional(),
  favicon: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  timezone: z.string().default('Asia/Kolkata'),
  workingDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  workingHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('09:00'),
  workingHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('17:00'),
  maxAppointmentsPerStudent: z.number().int().min(1).max(10).default(3),
  tokenAutoExpireMinutes: z.number().int().min(5).max(120).default(30),
});

// =============================================
// APPOINTMENT SCHEMAS
// =============================================

export const createAppointmentSchema = z.object({
  facultyId: z.string().cuid('Invalid faculty ID'),
  title: z.string().min(2, 'Title is required').max(200).trim(),
  purpose: z.string().max(1000).optional(),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  requestedStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  requestedEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  priority: z.nativeEnum(TicketPriority).default('MEDIUM'),
  studentNotes: z.string().max(500).optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
  confirmedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  confirmedStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  confirmedEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  rejectionReason: z.string().max(500).optional(),
  facultyNotes: z.string().max(1000).optional(),
});

export const rescheduleAppointmentSchema = z.object({
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  newStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  newEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  reason: z.string().max(500).optional(),
});

export const rateAppointmentSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
});

// =============================================
// QUEUE/TOKEN SCHEMAS
// =============================================

export const joinQueueSchema = z.object({
  facultyId: z.string().cuid('Invalid faculty ID'),
  purpose: z.string().max(500).optional(),
});

// =============================================
// SUPPORT TICKET SCHEMAS
// =============================================

export const createTicketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200).trim(),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000).trim(),
  category: z.enum(TicketCategories as unknown as readonly [string, ...string[]]),
  priority: z.nativeEnum(TicketPriority).default('MEDIUM'),
});

export const updateTicketSchema = z.object({
  status: z.nativeEnum({
    OPEN: 'OPEN',
    IN_PROGRESS: 'IN_PROGRESS',
    WAITING_ON_USER: 'WAITING_ON_USER',
    WAITING_ON_AGENT: 'WAITING_ON_AGENT',
    RESOLVED: 'RESOLVED',
    CLOSED: 'CLOSED',
  }).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  assignedTo: z.string().cuid().optional().nullable(),
});

export const ticketMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000).trim(),
  isInternal: z.boolean().default(false),
});

export const ticketSatisfactionSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
});

// =============================================
// KNOWLEDGE BASE SCHEMAS
// =============================================

export const createArticleSchema = z.object({
  title: z.string().min(5).max(200).trim(),
  content: z.string().min(100, 'Article content must be at least 100 characters').max(50000),
  excerpt: z.string().max(500).optional(),
  category: z.string().min(2).max(50).trim(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  isPublished: z.boolean().default(false),
});

export const updateArticleSchema = createArticleSchema.partial();

// =============================================
// ANNOUNCEMENT SCHEMAS
// =============================================

export const createAnnouncementSchema = z.object({
  title: z.string().min(5).max(200).trim(),
  content: z.string().min(10).max(10000),
  scope: z.enum(['PLATFORM', 'INSTITUTION', 'DEPARTMENT']),
  departmentId: z.string().cuid().optional(),
  isPublished: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
  isPinned: z.boolean().default(false),
});

// =============================================
// SCHEDULE SCHEMAS
// =============================================

export const createScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), // 0 = Sunday
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  scheduleType: z.enum(['OFFICE_HOURS', 'CLASS', 'MEETING', 'UNAVAILABLE']),
  label: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  isRecurring: z.boolean().default(true),
});

export const createLeaveSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leaveType: z.enum(['CASUAL', 'SICK', 'VACATION', 'CONFERENCE', 'OTHER']),
  reason: z.string().max(500).optional(),
});

// =============================================
// BILLING SCHEMAS
// =============================================

export const selectPlanSchema = z.object({
  planType: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
});

// =============================================
// SEARCH & FILTER SCHEMAS
// =============================================

export const facultySearchSchema = z.object({
  search: z.string().max(100).optional(),
  departmentId: z.string().cuid().optional(),
  status: z.nativeEnum(FacultyStatus).optional(),
  isAcceptingAppointments: z.boolean().optional(),
  ...paginationSchema.shape,
});

export const appointmentFilterSchema = z.object({
  status: z.nativeEnum(AppointmentStatus).optional(),
  facultyId: z.string().cuid().optional(),
  studentId: z.string().cuid().optional(),
  departmentId: z.string().cuid().optional(),
  ...dateRangeSchema.shape,
  ...paginationSchema.shape,
});

export const ticketFilterSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_USER', 'WAITING_ON_AGENT', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  category: z.string().optional(),
  assignedTo: z.string().cuid().optional(),
  ...dateRangeSchema.shape,
  ...paginationSchema.shape,
});

// =============================================
// TYPE EXPORTS
// =============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type InstitutionSetupInput = z.infer<typeof institutionSetupSchema>;
export type DepartmentSetupInput = z.infer<typeof departmentSetupSchema>;
export type BulkInviteInput = z.infer<typeof bulkInviteSchema>;
export type BrandingConfigInput = z.infer<typeof brandingConfigSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type JoinQueueInput = z.infer<typeof joinQueueSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketMessageInput = z.infer<typeof ticketMessageSchema>;
export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type SelectPlanInput = z.infer<typeof selectPlanSchema>;
export type FacultySearchInput = z.infer<typeof facultySearchSchema>;
export type AppointmentFilterInput = z.infer<typeof appointmentFilterSchema>;
export type TicketFilterInput = z.infer<typeof ticketFilterSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
