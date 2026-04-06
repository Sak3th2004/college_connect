const fs = require('fs');
const path = require('path');

const baseDir = process.cwd();

const dirs = [
  'apps/web/app/(marketing)',
  'apps/web/app/(auth)/login',
  'apps/web/app/(auth)/signup',
  'apps/web/app/(auth)/forgot-password',
  'apps/web/app/(auth)/reset-password',
  'apps/web/app/(auth)/verify-email',
  'apps/web/app/(auth)/accept-invite',
  'apps/web/app/onboarding',
  'apps/web/app/(dashboard)/student/home',
  'apps/web/app/(dashboard)/student/appointments',
  'apps/web/app/(dashboard)/student/queue',
  'apps/web/app/(dashboard)/faculty/dashboard',
  'apps/web/app/(dashboard)/faculty/schedule',
  'apps/web/app/(dashboard)/faculty/appointments',
  'apps/web/app/(dashboard)/college-admin/overview',
  'apps/web/app/(dashboard)/college-admin/departments',
  'apps/web/app/(dashboard)/college-admin/users',
  'apps/web/app/(dashboard)/super-admin/dashboard',
  'apps/web/app/(dashboard)/super-admin/institutions',
  'apps/web/app/(dashboard)/support-agent/tickets',
  'apps/web/app/help',
  'apps/web/app/api',
  'apps/web/components/ui',
  'apps/web/components/onboarding',
  'apps/web/components/auth',
  'apps/web/components/faculty',
  'apps/web/components/appointments',
  'apps/web/components/queue',
  'apps/web/components/support',
  'apps/web/components/admin',
  'apps/web/components/analytics',
  'apps/web/components/shared',
  'apps/web/components/layout',
  'apps/web/hooks',
  'apps/web/lib',
  'apps/web/public',
  'apps/mobile',
  'packages/api-server/src/routes',
  'packages/api-server/src/controllers',
  'packages/api-server/src/services',
  'packages/api-server/src/middleware',
  'packages/api-server/src/socket',
  'packages/api-server/src/jobs',
  'packages/api-server/src/utils',
  'packages/api-server/prisma',
  'packages/shared/src/types',
  'packages/shared/src/constants',
  'packages/shared/src/validation',
  'docs',
  '.github/workflows',
];

dirs.forEach(dir => {
  const fullPath = path.join(baseDir, dir);
  fs.mkdirSync(fullPath, { recursive: true });
  console.log(`Created: ${dir}`);
});

console.log('\nDirectory structure created successfully!');
