# HOA Community Management Platform - Quick Start Guide

**Version**: 1.0.0
**Last Updated**: 2025-01-21

## Overview

This guide helps developers get started with the HOA Community Management Platform - a multi-tenant application for managing residential communities with homeowner association governance.

## Architecture Summary

### Technology Stack
- **Backend**: NestJS with TypeScript
- **Frontend**: Next.js 14+ with React 18
- **Database**: PostgreSQL 15+ with Citus extension (multi-tenant)
- **Cache**: Redis Cluster
- **Authentication**: JWT with MFA for admin roles
- **Real-time**: Socket.io integration
- **Payments**: Stripe (primary) + PayPal (secondary)

### Multi-Tenant Strategy
- **Schema-per-Tenant**: Each residential community gets its own PostgreSQL schema
- **Data Isolation**: Complete separation between communities
- **Scalability**: Horizontal scaling with Citus
- **Security**: Tenant-scoped access controls and audit logging

## Quick Start

### Prerequisites

```bash
# Required software
- Node.js 18+
- PostgreSQL 15+ with Citus
- Redis 7+
- Docker & Docker Compose
- Git
```

### Environment Setup

1. **Clone Repository**
```bash
git clone https://github.com/yourorg/hoa-platform.git
cd hoa-platform
```

2. **Install Dependencies**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install shared packages
cd ../packages/ui
npm install
```

3. **Database Setup**
```bash
# Start PostgreSQL with Citus
docker-compose up -d postgres

# Create platform database
createdb hoa_platform

# Run migrations
npm run migration:run
```

4. **Environment Configuration**
```bash
# Backend environment
cp .env.example .env

# Frontend environment
cp .env.local.example .env.local
```

### Development Environment

1. **Start Development Services**
```bash
# Start all services in development mode
docker-compose -f docker-compose.dev.yml up -d
```

2. **Run Backend**
```bash
cd backend
npm run start:dev
```

3. **Run Frontend**
```bash
cd frontend
npm run dev
```

4. **Access Applications**
- Platform Admin: http://localhost:3001/platform
- HOA Admin: http://localhost:3002/admin
- Resident Portal: http://localhost:3003/residence
- Security Gate: http://localhost:3004/sentinel

## Project Structure

```
hoa-platform/
├── backend/                    # NestJS backend
│   ├── src/
│   │   ├── auth/              # Authentication & authorization
│   │   ├── tenants/           # Multi-tenant management
│   │   ├── households/        # Household management
│   │   ├── users/             # User management
│   │   ├── vehicles/          # Vehicle & gate passes
│   │   ├── guests/            # Guest management
│   │   ├── construction/      # Construction permits
│   │   ├── elections/         # HOA elections
│   │   ├── announcements/     # Communications
│   │   ├── gates/             # Security gate operations
│   │   ├── payments/          # Payment processing
│   │   ├── audit/             # Audit logging
│   │   └── database/          # Database schemas & migrations
│   ├── test/                  # Backend tests
│   └── package.json
├── frontend/                   # Next.js frontend (monorepo)
│   ├── apps/
│   │   ├── platform/          # Superadmin dashboard
│   │   ├── admin/             # HOA administration
│   │   ├── residence/         # Resident portal
│   │   └── sentinel/          # Security gate operations
│   ├── packages/
│   │   ├── ui/                # Shared component library
│   │   ├── auth/              # Authentication logic
│   │   ├── api/               # API client
│   │   └── types/             # TypeScript definitions
│   └── package.json
├── database/                   # Database setup
│   ├── migrations/            # Schema migrations
│   ├── seeds/                 # Seed data
│   └── schemas/               # SQL schemas
├── docs/                      # Documentation
├── docker/                    # Docker configurations
└── scripts/                   # Development scripts
```

## Development Workflow

### Creating a New Feature

1. **Create Feature Branch**
```bash
git checkout -b feature/new-feature-name
```

2. **Backend Development**
```bash
cd backend
# Generate new module
nest g module modules/feature-name
nest g controller modules/feature-name
nest g service modules/feature-name
```

3. **Frontend Development**
```bash
cd frontend
# Create new component/page
npm run generate component feature-name
```

4. **Database Changes**
```bash
cd backend
# Generate migration
npm run migration:generate -- CreateFeatureTable
```

5. **Testing**
```bash
# Backend tests
cd backend && npm run test

# Frontend tests
cd frontend && npm run test

# E2E tests
npm run test:e2e
```

### Multi-Tenant Development

When developing features, always consider tenant isolation:

```typescript
// Example: Tenant-scoped service
@Injectable()
export class HouseholdService {
  async findByTenant(tenantId: string) {
    // Use tenant-specific database connection
    const connection = await this.tenantService.getConnection(tenantId);
    return connection.query('SELECT * FROM households');
  }
}
```

### Authentication & Authorization

```typescript
// Example: Role-based access control
@Roles(['admin-head', 'admin-officer'])
@UseGuards(RolesGuard)
@Get('/households')
async getHouseholds(@Request() req) {
  const tenantId = req.user.tenantId;
  return this.householdService.findByTenant(tenantId);
}
```

## Common Development Tasks

### Adding New User Role

1. **Update Database Schema**
```sql
-- Add new role to enum
ALTER TYPE user_role ADD VALUE 'new-role';
```

2. **Update Frontend Types**
```typescript
// packages/types/src/user.ts
export type UserRole =
  | 'admin-head'
  | 'admin-officer'
  | 'household-head'
  | 'household-member'
  | 'household-beneficial-user'
  | 'security-head'
  | 'security-officer'
  | 'new-role';
```

3. **Update Authorization Logic**
```typescript
// backend/src/auth/roles.guard.ts
const roleHierarchy = {
  'superadmin': ['*'],
  'admin-head': ['household.*', 'permit.*'],
  'new-role': ['specific.permissions'],
};
```

### Creating New API Endpoint

1. **Define API Contract**
```yaml
# contracts/new-api.yaml
paths:
  /new-resource:
    get:
      summary: Get new resource
      tags:
        - New Feature
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Resource data
```

2. **Implement Backend**
```typescript
// backend/src/new-feature/new-feature.controller.ts
@Controller('new-feature')
@UseGuards(JwtAuthGuard)
export class NewFeatureController {
  @Get()
  async getResource() {
    return this.newFeatureService.findAll();
  }
}
```

3. **Create Frontend Component**
```typescript
// apps/admin/src/components/NewFeatureComponent.tsx
export function NewFeatureComponent() {
  const { data, loading, error } = useQuery('/new-feature');

  if (loading) return <Loading />;
  if (error) return <Error error={error} />;

  return <ResourceList data={data} />;
}
```

## Testing

### Unit Tests
```bash
# Backend unit tests
cd backend && npm run test

# Frontend unit tests
cd frontend && npm run test
```

### Integration Tests
```bash
# API integration tests
cd backend && npm run test:integration

# Frontend integration tests
cd frontend && npm run test:integration
```

### E2E Tests
```bash
# End-to-end tests
npm run test:e2e
```

### Multi-Tenant Testing
```bash
# Tenant isolation tests
npm run test:tenant-isolation

# Cross-tenant security tests
npm run test:tenant-security
```

## Deployment

### Development Deployment
```bash
# Deploy to development environment
npm run deploy:dev
```

### Staging Deployment
```bash
# Deploy to staging environment
npm run deploy:staging
```

### Production Deployment
```bash
# Deploy to production environment
npm run deploy:prod
```

## Monitoring & Debugging

### Application Logs
```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Database Queries
```bash
# Connect to database
psql -h localhost -U postgres -d hoa_platform

# View tenant schemas
\dn+

# Connect to specific tenant schema
\c tenant_001
```

### Performance Monitoring
- Application metrics: http://localhost:9464/metrics
- Database performance: PostgreSQL pg_stat_statements
- Cache performance: Redis INFO command

## Troubleshooting

### Common Issues

1. **Tenant Connection Issues**
```bash
# Check tenant exists
SELECT * FROM shared.tenants WHERE id = 'tenant-uuid';

# Check tenant schema
\dn tenant_001
```

2. **Authentication Problems**
```bash
# Check JWT token
npm run auth:verify <token>

# Check user roles
SELECT * FROM tenant_001.users WHERE email = 'user@example.com';
```

3. **Database Migration Issues**
```bash
# Check migration status
npm run migration:show

# Rollback migration
npm run migration:rollback
```

## Resources

### Documentation
- [API Documentation](./contracts/)
- [Database Schema](./data-model.md)
- [Architecture Guide](./research.md)
- [Constitution](./../.specify/memory/constitution.md)

### Development Tools
- [Swagger UI](http://localhost:3001/api/docs) - API documentation
- [Postman Collection](./tools/postman/) - API testing
- [Database Diagrams](./docs/database/) - ER diagrams

### Support
- Development Team: dev-team@villagetech.com
- Architecture Team: arch-team@villagetech.com
- Documentation: docs@villagetech.com

## Next Steps

1. **Review Architecture**: Read [research.md](./research.md) for detailed technology decisions
2. **Study Data Model**: Review [data-model.md](./data-model.md) for entity relationships
3. **Examine API Contracts**: Check [contracts/](./contracts/) for API specifications
4. **Set Up Development**: Follow the setup steps above
5. **Run First Tests**: Execute test suites to verify environment
6. **Create First Feature**: Use the development workflow to implement a simple feature

For detailed implementation guidance, proceed to the [implementation plan](./plan.md).