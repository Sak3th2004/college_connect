import { PrismaClient, UserRole, FacultyStatus, OnboardingStatus, PlanType, SubscriptionStatus, BillingCycle } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Super Admin
  const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@campusconnect.app' },
    update: {},
    create: {
      email: 'superadmin@campusconnect.app',
      passwordHash: superAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Super Admin created:', superAdmin.email);

  // Create Demo Institution
  const demoInstitution = await prisma.institution.upsert({
    where: { code: 'DEMO-COLLEGE' },
    update: {},
    create: {
      name: 'Demo College of Engineering',
      code: 'DEMO-COLLEGE',
      slug: 'demo-college',
      address: '123 Education Street',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
      email: 'admin@democollege.edu',
      website: 'https://democollege.edu',
      timezone: 'Asia/Kolkata',
      workingDays: [1, 2, 3, 4, 5],
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      maxAppointmentsPerStudent: 3,
      tokenAutoExpireMinutes: 30,
      isActive: true,
      onboardingStatus: OnboardingStatus.COMPLETED,
    },
  });
  console.log('✅ Demo Institution created:', demoInstitution.name);

  // Create Demo Subscription
  const subscription = await prisma.subscription.upsert({
    where: { id: 'demo-subscription' },
    update: {},
    create: {
      id: 'demo-subscription',
      institutionId: demoInstitution.id,
      planType: PlanType.PRO,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: BillingCycle.YEARLY,
      amount: 99990,
      currency: 'INR',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // Create Departments
  const csDept = await prisma.department.upsert({
    where: { institutionId_code: { institutionId: demoInstitution.id, code: 'CS' } },
    update: {},
    create: {
      institutionId: demoInstitution.id,
      name: 'Computer Science',
      code: 'CS',
      description: 'Department of Computer Science and Engineering',
      building: 'Main Building',
      floor: '3',
      isActive: true,
    },
  });

  const eceDept = await prisma.department.upsert({
    where: { institutionId_code: { institutionId: demoInstitution.id, code: 'ECE' } },
    update: {},
    create: {
      institutionId: demoInstitution.id,
      name: 'Electronics & Communication',
      code: 'ECE',
      description: 'Department of Electronics and Communication Engineering',
      building: 'Tech Block',
      floor: '2',
      isActive: true,
    },
  });
  console.log('✅ Departments created');

  // Create Institution Admin
  const institutionAdminPassword = await bcrypt.hash('Admin123!', 12);
  const institutionAdmin = await prisma.user.upsert({
    where: { email: 'admin@democollege.edu' },
    update: {},
    create: {
      email: 'admin@democollege.edu',
      passwordHash: institutionAdminPassword,
      firstName: 'College',
      lastName: 'Admin',
      role: UserRole.INSTITUTION_ADMIN,
      institutionId: demoInstitution.id,
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Institution Admin created:', institutionAdmin.email);

  // Create Demo Faculty
  const facultyPassword = await bcrypt.hash('Faculty123!', 12);
  
  const faculty1 = await prisma.user.upsert({
    where: { email: 'john.doe@democollege.edu' },
    update: {},
    create: {
      email: 'john.doe@democollege.edu',
      passwordHash: facultyPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.FACULTY,
      institutionId: demoInstitution.id,
      departmentId: csDept.id,
      isEmailVerified: true,
      isActive: true,
    },
  });

  await prisma.facultyProfile.upsert({
    where: { userId: faculty1.id },
    update: {},
    create: {
      userId: faculty1.id,
      employeeId: 'FAC001',
      designation: 'Associate Professor',
      specialization: 'Machine Learning, Data Science',
      cabinNumber: 'CS-301',
      building: 'Main Building',
      floor: '3',
      currentStatus: FacultyStatus.FREE,
      isAcceptingAppointments: true,
      maxDailyAppointments: 15,
      appointmentSlotDuration: 15,
    },
  });

  const faculty2 = await prisma.user.upsert({
    where: { email: 'jane.smith@democollege.edu' },
    update: {},
    create: {
      email: 'jane.smith@democollege.edu',
      passwordHash: facultyPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.FACULTY,
      institutionId: demoInstitution.id,
      departmentId: csDept.id,
      isEmailVerified: true,
      isActive: true,
    },
  });

  await prisma.facultyProfile.upsert({
    where: { userId: faculty2.id },
    update: {},
    create: {
      userId: faculty2.id,
      employeeId: 'FAC002',
      designation: 'Professor',
      specialization: 'Algorithms, Distributed Systems',
      cabinNumber: 'CS-302',
      building: 'Main Building',
      floor: '3',
      currentStatus: FacultyStatus.IN_MEETING,
      statusMessage: 'In department meeting until 3 PM',
      isAcceptingAppointments: true,
      maxDailyAppointments: 10,
      appointmentSlotDuration: 20,
    },
  });
  console.log('✅ Faculty created');

  // Create Demo Students
  const studentPassword = await bcrypt.hash('Student123!', 12);

  const student1 = await prisma.user.upsert({
    where: { email: 'alice@democollege.edu' },
    update: {},
    create: {
      email: 'alice@democollege.edu',
      passwordHash: studentPassword,
      firstName: 'Alice',
      lastName: 'Johnson',
      role: UserRole.STUDENT,
      institutionId: demoInstitution.id,
      departmentId: csDept.id,
      isEmailVerified: true,
      isActive: true,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: student1.id },
    update: {},
    create: {
      userId: student1.id,
      rollNumber: 'CS2024001',
      admissionYear: 2024,
      program: 'B.Tech Computer Science',
      semester: 1,
      batch: '2024-2028',
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'bob@democollege.edu' },
    update: {},
    create: {
      email: 'bob@democollege.edu',
      passwordHash: studentPassword,
      firstName: 'Bob',
      lastName: 'Williams',
      role: UserRole.STUDENT,
      institutionId: demoInstitution.id,
      departmentId: csDept.id,
      isEmailVerified: true,
      isActive: true,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: student2.id },
    update: {},
    create: {
      userId: student2.id,
      rollNumber: 'CS2024002',
      admissionYear: 2024,
      program: 'B.Tech Computer Science',
      semester: 1,
      batch: '2024-2028',
    },
  });
  console.log('✅ Students created');

  // Create some faculty schedules
  const facultyProfile = await prisma.facultyProfile.findUnique({
    where: { userId: faculty1.id },
  });

  if (facultyProfile) {
    // Office hours Monday, Wednesday, Friday 2-4 PM
    for (const day of [1, 3, 5]) {
      await prisma.facultySchedule.upsert({
        where: { id: `${facultyProfile.id}-${day}-office` },
        update: {},
        create: {
          id: `${facultyProfile.id}-${day}-office`,
          facultyId: facultyProfile.id,
          dayOfWeek: day,
          startTime: '14:00',
          endTime: '16:00',
          scheduleType: 'OFFICE_HOURS',
          label: 'Office Hours',
          location: 'CS-301',
          isRecurring: true,
        },
      });
    }
    console.log('✅ Faculty schedules created');
  }

  // Create Feature Flags
  const featureFlags = [
    { key: 'ai_chatbot', name: 'AI Chatbot', description: 'Enable AI-powered student chatbot', enabledPlans: [PlanType.PRO, PlanType.ENTERPRISE] },
    { key: 'smart_scheduling', name: 'Smart Scheduling', description: 'AI-powered appointment suggestions', enabledPlans: [PlanType.PRO, PlanType.ENTERPRISE] },
    { key: 'document_scanning', name: 'Document Scanning', description: 'AI pre-screening of uploaded documents', enabledPlans: [PlanType.ENTERPRISE] },
    { key: 'sso_integration', name: 'SSO Integration', description: 'SAML/LDAP single sign-on', enabledPlans: [PlanType.ENTERPRISE] },
    { key: 'advanced_analytics', name: 'Advanced Analytics', description: 'Detailed analytics and reports', enabledPlans: [PlanType.PRO, PlanType.ENTERPRISE] },
    { key: 'custom_branding', name: 'Custom Branding', description: 'Custom logo and colors', enabledPlans: [PlanType.PRO, PlanType.ENTERPRISE] },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    });
  }
  console.log('✅ Feature flags created');

  console.log('\n🎉 Seeding completed!\n');
  console.log('Demo Credentials:');
  console.log('─────────────────');
  console.log('Super Admin:       superadmin@campusconnect.app / SuperAdmin123!');
  console.log('Institution Admin: admin@democollege.edu / Admin123!');
  console.log('Faculty:           john.doe@democollege.edu / Faculty123!');
  console.log('Faculty:           jane.smith@democollege.edu / Faculty123!');
  console.log('Student:           alice@democollege.edu / Student123!');
  console.log('Student:           bob@democollege.edu / Student123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
