const fs = require('fs');
const path = require('path');

// Get the directory where the script is located
const baseDir = path.resolve(__dirname);
console.log('Base directory:', baseDir);
console.log('Current working directory:', process.cwd());

const dirs = [
  // Web app structure
  'apps/web/app/(marketing)',
  'apps/web/app/(marketing)/pricing',
  'apps/web/app/(marketing)/about',
  'apps/web/app/(marketing)/contact',
  'apps/web/app/(marketing)/demo',
  'apps/web/app/(auth)/login',
  'apps/web/app/(auth)/signup',
  'apps/web/app/(auth)/forgot-password',
  'apps/web/app/(auth)/reset-password',
  'apps/web/app/(auth)/verify-email',
  'apps/web/app/(auth)/accept-invite',
  'apps/web/app/(auth)/setup-2fa',
  'apps/web/app/onboarding/departments',
  'apps/web/app/onboarding/invite-faculty',
  'apps/web/app/onboarding/invite-students',
  'apps/web/app/onboarding/configure',
  'apps/web/app/onboarding/review',
  'apps/web/app/onboarding/complete',
  'apps/web/app/(dashboard)/student/home',
  'apps/web/app/(dashboard)/student/appointments',
  'apps/web/app/(dashboard)/student/queue',
  'apps/web/app/(dashboard)/student/history',
  'apps/web/app/(dashboard)/student/notifications',
  'apps/web/app/(dashboard)/student/support',
  'apps/web/app/(dashboard)/student/profile',
  'apps/web/app/(dashboard)/student/help',
  'apps/web/app/(dashboard)/faculty/dashboard',
  'apps/web/app/(dashboard)/faculty/schedule',
  'apps/web/app/(dashboard)/faculty/appointments',
  'apps/web/app/(dashboard)/faculty/queue',
  'apps/web/app/(dashboard)/faculty/office-hours',
  'apps/web/app/(dashboard)/faculty/notifications',
  'apps/web/app/(dashboard)/faculty/support',
  'apps/web/app/(dashboard)/faculty/profile',
  'apps/web/app/(dashboard)/faculty/help',
  'apps/web/app/(dashboard)/dept-admin/overview',
  'apps/web/app/(dashboard)/dept-admin/faculty',
  'apps/web/app/(dashboard)/dept-admin/students',
  'apps/web/app/(dashboard)/dept-admin/reports',
  'apps/web/app/(dashboard)/dept-admin/settings',
  'apps/web/app/(dashboard)/dept-admin/support',
  'apps/web/app/(dashboard)/college-admin/overview',
  'apps/web/app/(dashboard)/college-admin/departments',
  'apps/web/app/(dashboard)/college-admin/users',
  'apps/web/app/(dashboard)/college-admin/faculty-mgmt',
  'apps/web/app/(dashboard)/college-admin/student-mgmt',
  'apps/web/app/(dashboard)/college-admin/invitations',
  'apps/web/app/(dashboard)/college-admin/access-control',
  'apps/web/app/(dashboard)/college-admin/announcements',
  'apps/web/app/(dashboard)/college-admin/branding',
  'apps/web/app/(dashboard)/college-admin/policies',
  'apps/web/app/(dashboard)/college-admin/reports',
  'apps/web/app/(dashboard)/college-admin/audit-logs',
  'apps/web/app/(dashboard)/college-admin/support',
  'apps/web/app/(dashboard)/college-admin/billing',
  'apps/web/app/(dashboard)/college-admin/settings',
  'apps/web/app/(dashboard)/support-agent/tickets',
  'apps/web/app/(dashboard)/support-agent/knowledge-base',
  'apps/web/app/(dashboard)/support-agent/canned-responses',
  'apps/web/app/super-admin/dashboard',
  'apps/web/app/super-admin/institutions',
  'apps/web/app/super-admin/users',
  'apps/web/app/super-admin/billing',
  'apps/web/app/super-admin/support',
  'apps/web/app/super-admin/feature-flags',
  'apps/web/app/super-admin/announcements',
  'apps/web/app/super-admin/analytics',
  'apps/web/app/super-admin/audit-logs',
  'apps/web/app/super-admin/system-health',
  'apps/web/app/super-admin/settings',
  'apps/web/app/help',
  'apps/web/app/help/faq',
  'apps/web/app/help/contact-support',
  'apps/web/app/api/auth',
  'apps/web/app/api/v1',
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
  'apps/web/public/images',
  'apps/web/public/icons',
  'apps/web/styles',
  
  // Mobile app placeholder
  'apps/mobile/src',
  
  // API server structure
  'packages/api-server/src/routes',
  'packages/api-server/src/controllers',
  'packages/api-server/src/services',
  'packages/api-server/src/middleware',
  'packages/api-server/src/socket',
  'packages/api-server/src/jobs',
  'packages/api-server/src/utils',
  'packages/api-server/src/config',
  'packages/api-server/prisma/migrations',
  
  // Shared package
  'packages/shared/src/types',
  'packages/shared/src/constants',
  'packages/shared/src/validation',
  
  // Docs and CI
  'docs',
  '.github/workflows',
];

console.log('Creating CampusConnect directory structure...\n');

let created = 0;
let errors = 0;

dirs.forEach(dir => {
  const fullPath = path.join(baseDir, dir);
  try {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ ${dir}`);
    created++;
  } catch (err) {
    console.error(`✗ ${dir}: ${err.message}`);
    errors++;
  }
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Created: ${created} directories`);
if (errors > 0) console.log(`Errors: ${errors}`);
console.log(`${'='.repeat(50)}\n`);
console.log('Directory structure created successfully!');
console.log('Next step: Run "npm install" to install dependencies.');
