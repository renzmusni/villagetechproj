# HOA Community Platform

A comprehensive multi-tenant platform for managing residential communities governed by homeowners associations.

## 🏗️ Architecture

This project implements enterprise-grade architecture with following key features:

- **Multi-tenant Architecture**: Support for 1,000+ concurrent residential communities
- **Role-Based Access Control**: 8 distinct user roles with granular permissions
- **Four Application Suite**: Platform API, Admin Dashboard, Resident Portal, Security Gate Operations
- **Real-time Security Operations**: WebSocket integration for live gate operations
- **Comprehensive Audit Trail**: Complete audit logging for compliance and security

## 🚀 Technology Stack

### Backend
- **Framework**: NestJS 11.x (Node.js 20+, TypeScript)
- **Database**: PostgreSQL 15+ with Citus for distributed multi-tenant scaling
- **Cache**: Redis 7+ for caching and real-time data
- **Authentication**: JWT with MFA support
- **API Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest (unit/integration), Playwright (E2E)

### Frontend
- **Framework**: Next.js 14+ (React 18+)
- **TypeScript**: Strict mode with comprehensive type definitions
- **Styling**: Tailwind CSS (planned)

### Infrastructure
- **Containerization**: Docker multi-stage builds
- **Orchestration**: Docker Compose for development
- **Reverse Proxy**: Nginx
- **CI/CD**: Ready for GitHub Actions integration

## 📁 Project Structure

```
hoa-community-platform/
├── src/
│   ├── platform/     # NestJS backend API
│   ├── admin/        # Next.js admin dashboard
│   ├── residence/    # Next.js resident portal
│   └── sentinel/     # Next.js security gate app
├── libs/
│   └── shared/       # Shared types, utils, validators
├── scripts/          # Database initialization
├── tests/           # E2E and integration tests
├── docs/            # Documentation
├── docker-compose.yml
├── Dockerfile
└── Configuration files
```

## 🏛️ User Roles & Permissions

1. **Super Admin**: Platform-wide administration
2. **Platform Admin**: Multi-community management
3. **Tenant Admin**: Community-level administration
4. **Admin Head**: HOA committee leadership
5. **Security Head**: Security operations management
6. **Household Head**: Household management
7. **Resident**: Basic resident access
8. **Security Officer**: Gate operations

## 🚦 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+ (for local development)
- Redis 7+ (for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hoa-community-platform
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start development environment**
   ```bash
   # Start with Docker (recommended)
   docker-compose up -d

   # Or start services individually
   npm run dev:platform  # Backend API on port 3000
   npm run dev:admin     # Admin dashboard on port 3001
   npm run dev:residence # Resident portal on port 3002
   npm run dev:sentinel  # Security gate on port 3003
   ```

5. **Database setup**
   ```bash
   # Initialize database with schema
   npm run db:migrate
   ```

6. **Access applications**
   - API: http://localhost:3000
   - API Documentation: http://localhost:3000/api/docs
   - Admin Dashboard: http://localhost:3001
   - Resident Portal: http://localhost:3002
   - Security Gate: http://localhost:3003

## 🏗️ Development

### Scripts

```bash
# Development
npm run dev:platform    # Start backend API
npm run dev:admin       # Start admin dashboard
npm run dev:residence   # Start resident portal
npm run dev:sentinel    # Start security gate app
npm run start:all       # Start all applications

# Building
npm run build           # Build all applications
npm run build:platform  # Build platform only
npm run build:admin     # Build admin only

# Testing
npm run test            # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
npm run test:e2e        # Run E2E tests

# Code Quality
npm run lint            # Lint all code
npm run lint:fix        # Fix linting issues
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting
```

### Database

```bash
# Migrations
npm run db:migrate      # Run migrations
npm run db:create       # Create new migration
npm run db:revert       # Revert last migration

# Seeding
npm run db:seed         # Seed database with sample data
npm run db:seed:dev     # Seed development data
```

### Docker

```bash
# Development
docker-compose up -d               # Start all services
docker-compose logs -f platform     # View platform logs
docker-compose exec platform npm run db:migrate  # Run migrations in container

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 API Documentation

Once the platform is running, visit http://localhost:3000/api/docs for comprehensive API documentation with Swagger UI.

## 🔒 Security Features

- **Multi-Factor Authentication**: Support for TOTP-based MFA
- **Role-Based Access Control**: Granular permissions across 8 user roles
- **Data Encryption**: Encryption at rest and in transit
- **Audit Logging**: Complete audit trail for all operations
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation and sanitization
- **CORS Configuration**: Secure cross-origin resource sharing

## 🏢 Multi-Tenancy

This platform supports multi-tenant architecture with:

- **Schema-per-Tenant**: Complete data isolation between communities
- **Horizontal Scaling**: Citus for distributed database scaling
- **Tenant Management**: Dynamic tenant creation and management
- **Resource Isolation**: Separate resources per tenant

## 🧪 Testing

- **Unit Tests**: Jest with 80% coverage threshold
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright for end-to-end testing
- **Performance Tests**: Load testing capabilities (planned)

## 📊 Monitoring & Logging

- **Structured Logging**: JSON format logs with correlation IDs
- **Performance Monitoring**: Request/response time tracking
- **Error Tracking**: Comprehensive error logging and reporting
- **Health Checks**: Application health endpoints

## 🚀 Deployment

### Production Deployment

1. **Environment Configuration**
   ```bash
   cp .env.example .env.production
   # Configure production environment variables
   ```

2. **Build Applications**
   ```bash
   npm run build
   ```

3. **Deploy with Docker**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Environment Variables

Key environment variables to configure:

- `NODE_ENV`: Environment (development/staging/production)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT signing secret
- `CORS_ORIGIN`: Allowed CORS origins

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode guidelines
- Write tests for new features
- Update documentation
- Follow conventional commit messages
- Ensure code passes linting and formatting

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:

- Create an issue in the repository
- Check the documentation at `/docs`
- Review API documentation at `/api/docs`

## 🗺️ Roadmap

### Phase 1: Core Platform (Current)
- [x] Multi-tenant architecture
- [x] Authentication & authorization
- [x] Basic CRUD operations
- [x] API documentation

### Phase 2: Business Features
- [ ] Household management
- [ ] Vehicle gate passes
- [ ] Guest scheduling
- [ ] Construction permits

### Phase 3: Advanced Features
- [ ] HOA elections
- [ ] Community announcements
- [ ] Payment processing
- [ ] Mobile applications

### Phase 4: Enterprise Features
- [ ] Advanced analytics
- [ ] API rate limiting
- [ ] Advanced security features
- [ ] Performance optimization

---

**Built with ❤️ for residential communities**