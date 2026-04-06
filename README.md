# CampusConnect

> 🎓 A real-time faculty availability, smart appointment booking, and campus operations platform for educational institutions.

## Overview

CampusConnect is a multi-tenant SaaS platform that helps colleges and universities:

- **Faculty** update their real-time status (Free, In Meeting, In Class, On Leave, DND)
- **Students** view availability, book appointments, and receive digital queue tokens
- **Admins** manage users, departments, and view analytics
- **AI** suggests optimal meeting times and pre-screens documents

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL (Prisma ORM), Redis |
| Real-time | Socket.io |
| Auth | JWT with refresh tokens, RBAC |
| AI | Claude API (Anthropic) |

## Project Structure

```
campusconnect/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── mobile/              # React Native (Phase 3)
├── packages/
│   ├── api-server/          # Express backend
│   │   ├── prisma/          # Database schema & migrations
│   │   └── src/             # Routes, controllers, services
│   └── shared/              # Shared types, constants, validation
├── docker-compose.yml       # Local PostgreSQL & Redis
└── turbo.json              # Monorepo task runner
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or pnpm

### 1. Clone and Install

```bash
git clone <repo-url>
cd campusconnect
npm install
```

### 2. Start Database Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### 3. Configure Environment

```bash
# Copy example env file
cp packages/api-server/.env.example packages/api-server/.env

# Edit with your values (defaults work for local dev)
```

### 4. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:push

# Seed demo data
npm run db:seed
```

### 5. Start Development Servers

```bash
npm run dev
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## Demo Credentials

After seeding, use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@campusconnect.app | SuperAdmin123! |
| College Admin | admin@democollege.edu | Admin123! |
| Faculty | john.doe@democollege.edu | Faculty123! |
| Student | alice@democollege.edu | Student123! |

## API Documentation

API endpoints are available at `http://localhost:4000/api/v1/`

Key endpoints:
- `POST /auth/login` - Authenticate user
- `POST /auth/register` - Register new user
- `GET /faculty` - List faculty with filters
- `PUT /faculty/status` - Update faculty status
- `POST /appointments` - Create appointment
- `POST /queue/join` - Join faculty queue
- `GET /queue/:facultyId` - Get queue status

## User Roles

| Role | Permissions |
|------|-------------|
| STUDENT | View faculty, book appointments, join queue |
| FACULTY | Manage status, handle appointments, manage queue |
| DEPARTMENT_ADMIN | Manage department users, view analytics |
| INSTITUTION_ADMIN | Full college control, billing, all analytics |
| SUPER_ADMIN | Platform-wide access, manage all institutions |
| SUPPORT_AGENT | Handle support tickets across assigned scope |

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start all services
npm run dev:web          # Frontend only
npm run dev:api          # Backend only

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Sync schema to DB
npm run db:migrate       # Create migration
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed demo data

# Build
npm run build            # Build all packages
npm run lint             # Lint all packages
```

### Adding a New Feature

1. Add types to `packages/shared/src/types/`
2. Add validation schemas to `packages/shared/src/validation/`
3. Create backend route in `packages/api-server/src/routes/`
4. Add frontend pages in `apps/web/app/`

## Deployment

### Production Environment Variables

Required environment variables for production:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<random-64-char-string>
FRONTEND_URL=https://your-domain.com
```

### Docker Production Build

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## License

MIT

---

Built with ❤️ for educational institutions
