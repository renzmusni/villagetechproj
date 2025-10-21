# Data Model: HOA Community Management Platform

**Date**: 2025-01-21
**Architecture**: Multi-tenant with schema-per-tenant PostgreSQL + Citus
**Applications**: Platform, Admin, Residence, Sentinel

## Multi-Tenant Data Architecture

### Tenant Structure
```
hoa_platform/
├── shared/                    # Platform-level data
│   ├── tenants               # Residential community metadata
│   ├── platform_users        # Superadmin accounts
│   └── platform_settings     # Global configuration
├── tenant_template/          # Template schema for new tenants
└── tenant_{id}/              # Individual tenant schemas
    ├── households/
    ├── residences/
    ├── users/
    ├── vehicles/
    ├── gate_passes/
    ├── guests/
    ├── construction_permits/
    ├── announcements/
    ├── elections/
    └── audit_logs/
```

## Shared Schema (Platform Level)

### tenants
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Community name |
| address | TEXT | Physical address |
| contact_email | VARCHAR(255) | Admin contact |
| status | ENUM('active', 'inactive', 'suspended') | Tenant status |
| settings | JSONB | Community-specific settings |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update |

### platform_users
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email |
| password_hash | VARCHAR(255) | Hashed password |
| role | ENUM('superadmin') | Platform role |
| mfa_enabled | BOOLEAN | Multi-factor auth status |
| mfa_secret | VARCHAR(255) | MFA secret |
| created_at | TIMESTAMP | Creation timestamp |
| last_login | TIMESTAMP | Last login time |

## Tenant Schema Template

### households
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Household name |
| primary_contact | VARCHAR(255) | Primary contact person |
| email | VARCHAR(255) | Household email |
| phone | VARCHAR(50) | Contact phone |
| status | ENUM('active', 'inactive') | Household status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update |

### residences
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| household_id | UUID FK | Foreign key to households |
| address | TEXT | Physical address |
| unit_number | VARCHAR(50) | Unit/apartment number |
| type | ENUM('house', 'apartment', 'condo', 'townhouse') | Residence type |
| square_footage | INTEGER | Size in sq ft |
| bedrooms | INTEGER | Number of bedrooms |
| bathrooms | INTEGER | Number of bathrooms |
| status | ENUM('occupied', 'vacant', 'under_construction') | Occupancy status |
| created_at | TIMESTAMP | Creation timestamp |

### users
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| household_id | UUID FK | Foreign key to households |
| email | VARCHAR(255) | Unique email (within tenant) |
| password_hash | VARCHAR(255) | Hashed password |
| first_name | VARCHAR(100) | First name |
| last_name | VARCHAR(100) | Last name |
| phone | VARCHAR(50) | Phone number |
| role | ENUM('admin-head', 'admin-officer', 'household-head', 'household-member', 'household-beneficial-user', 'security-head', 'security-officer') | User role |
| status | ENUM('active', 'inactive', 'suspended') | User status |
| mfa_enabled | BOOLEAN | Multi-factor auth status |
| mfa_secret | VARCHAR(255) | MFA secret (for admin roles) |
| last_login | TIMESTAMP | Last login time |
| created_at | TIMESTAMP | Creation timestamp |

### vehicles
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| household_id | UUID FK | Foreign key to households |
| make | VARCHAR(100) | Vehicle make |
| model | VARCHAR(100) | Vehicle model |
| year | INTEGER | Vehicle year |
| color | VARCHAR(50) | Vehicle color |
| license_plate | VARCHAR(20) | License plate number |
| vin | VARCHAR(17) | Vehicle identification number |
| registration_expiry | DATE | Registration expiration |
| status | ENUM('active', 'inactive', 'sold') | Vehicle status |
| created_at | TIMESTAMP | Creation timestamp |

### gate_passes
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| household_id | UUID FK | Foreign key to households |
| vehicle_id | UUID FK | Foreign key to vehicles |
| user_id | UUID FK | Pass holder (household member or beneficial user) |
| pass_type | ENUM('sticker', 'temporary', 'digital') | Pass type |
| pass_number | VARCHAR(50) | Pass identifier |
| valid_from | DATE | Valid from date |
| valid_to | DATE | Valid to date |
| status | ENUM('active', 'expired', 'revoked', 'pending') | Pass status |
| issued_by | UUID FK | Admin who issued pass |
| issued_at | TIMESTAMP | Issue timestamp |
| qr_code | TEXT | QR code data |
| created_at | TIMESTAMP | Creation timestamp |

### guests
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| household_id | UUID FK | Foreign key to households |
| first_name | VARCHAR(100) | Guest first name |
| last_name | VARCHAR(100) | Guest last name |
| visit_type | ENUM('day_trip', 'multi_day') | Visit type |
| visit_date_start | TIMESTAMP | Visit start time |
| visit_date_end | TIMESTAMP | Visit end time |
| purpose | TEXT | Visit purpose |
| vehicle_info | JSONB | Vehicle information (if applicable) |
| status | ENUM('scheduled', 'checked_in', 'checked_out', 'cancelled') | Visit status |
| notes | TEXT | Additional notes |
| created_by | UUID FK | Household member who scheduled |
| created_at | TIMESTAMP | Creation timestamp |

### construction_permits
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| household_id | UUID FK | Foreign key to households |
| residence_id | UUID FK | Foreign key to residences |
| project_title | VARCHAR(255) | Project title |
| description | TEXT | Project description |
| start_date | DATE | Planned start date |
| end_date | DATE | Planned end date |
| contractor_name | VARCHAR(255) | Contractor name |
| contractor_license | VARCHAR(100) | Contractor license |
| permit_fee | DECIMAL(10,2) | Permit fee amount |
| payment_status | ENUM('pending', 'paid', 'refunded') | Payment status |
| payment_id | VARCHAR(100) | External payment ID |
| status | ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled') | Permit status |
| approved_by | UUID FK | Admin who approved |
| approved_at | TIMESTAMP | Approval timestamp |
| documents | JSONB | Supporting documents |
| created_at | TIMESTAMP | Creation timestamp |

### construction_workers
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| permit_id | UUID FK | Foreign key to construction_permits |
| first_name | VARCHAR(100) | Worker first name |
| last_name | VARCHAR(100) | Worker last name |
| company | VARCHAR(255) | Company name |
| phone | VARCHAR(50) | Contact phone |
| pass_type | ENUM('daily', 'weekly', 'project_duration') | Pass type |
| valid_from | TIMESTAMP | Pass valid from |
| valid_to | TIMESTAMP | Pass valid to |
| status | ENUM('active', 'expired', 'revoked') | Pass status |
| photo_url | TEXT | Worker photo |
| created_at | TIMESTAMP | Creation timestamp |

### gates
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Gate name |
| description | TEXT | Gate description |
| location | VARCHAR(255) | Gate location |
| type | ENUM('vehicle', 'pedestrian', 'mixed') | Gate type |
| status | ENUM('active', 'inactive', 'maintenance') | Gate status |
| operating_hours | JSONB | Operating hours |
| access_rules | JSONB | Access control rules |
| created_at | TIMESTAMP | Creation timestamp |

### gate_access_logs
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| gate_id | UUID FK | Foreign key to gates |
| user_id | UUID FK | User attempting access (can be null) |
| vehicle_id | UUID FK | Vehicle attempting access (can be null) |
| guest_id | UUID FK | Guest attempting access (can be null) |
| worker_id | UUID FK | Construction worker attempting access (can be null) |
| access_type | ENUM('entry', 'exit') | Access direction |
| result | ENUM('granted', 'denied', 'error') | Access result |
| reason | VARCHAR(255) | Reason for denial/grant |
| scanned_by | UUID FK | Security officer who scanned |
| timestamp | TIMESTAMP | Access timestamp |
| additional_data | JSONB | Additional log data |

### announcements
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| title | VARCHAR(255) | Announcement title |
| content | TEXT | Announcement content |
| priority | ENUM('low', 'normal', 'high', 'urgent') | Priority level |
| target_audience | JSONB | Target audience filters |
| delivery_method | ENUM('email', 'sms', 'push', 'in_app') | Delivery method |
| scheduled_at | TIMESTAMP | Scheduled delivery time |
| sent_at | TIMESTAMP | Actual send time |
| status | ENUM('draft', 'scheduled', 'sent', 'cancelled') | Announcement status |
| created_by | UUID FK | Author |
| read_receipts | JSONB | Read tracking data |
| created_at | TIMESTAMP | Creation timestamp |

### elections
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| title | VARCHAR(255) | Election title |
| description | TEXT | Election description |
| positions | JSONB | Available positions and requirements |
| nomination_start | TIMESTAMP | Nomination period start |
| nomination_end | TIMESTAMP | Nomination period end |
| voting_start | TIMESTAMP | Voting period start |
| voting_end | TIMESTAMP | Voting period end |
| status | ENUM('planned', 'nomination', 'voting', 'completed', 'cancelled') | Election status |
| eligibility_rules | JSONB | Voting eligibility criteria |
| created_by | UUID FK | Election creator |
| created_at | TIMESTAMP | Creation timestamp |

### election_candidates
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| election_id | UUID FK | Foreign key to elections |
| user_id | UUID FK | Foreign key to users |
| position | VARCHAR(100) | Position sought |
| platform | TEXT | Candidate platform |
| status | ENUM('nominated', 'withdrawn', 'elected', 'not_elected') | Candidate status |
| nomination_date | TIMESTAMP | Nomination timestamp |
| votes_received | INTEGER | Vote count |

### election_votes
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| election_id | UUID FK | Foreign key to elections |
| voter_id | UUID FK | Foreign key to users |
| candidate_id | UUID FK | Foreign key to election_candidates |
| position | VARCHAR(100) | Position voted for |
| voted_at | TIMESTAMP | Vote timestamp |
| ip_address | INET | Voter IP address |
| verified | BOOLEAN | Vote verification status |

### audit_logs
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID FK | User who performed action |
| action | VARCHAR(100) | Action performed |
| entity_type | VARCHAR(100) | Type of entity affected |
| entity_id | UUID | ID of affected entity |
| old_values | JSONB | Previous values (for updates) |
| new_values | JSONB | New values |
| reason | TEXT | Reason for action |
| ip_address | INET | User IP address |
| user_agent | TEXT | User agent string |
| timestamp | TIMESTAMP | Action timestamp |

## Entity Relationships

### Core Relationships
- **Tenant** → 1:N → **Households**
- **Household** → 1:N → **Users**, **Residences**, **Vehicles**
- **Household** → 1:N → **Gate Passes**, **Guests**, **Construction Permits**
- **Construction Permit** → 1:N → **Construction Workers**
- **User** → 1:N → **Election Candidates**, **Election Votes**
- **Election** → 1:N → **Election Candidates**, **Election Votes**

### Access Control Relationships
- **Gate** → 1:N → **Gate Access Logs**
- **User** → 1:N → **Gate Access Logs** (as scanner)
- **Announcement** → N:N → **Users** (through read receipts)

## Indexing Strategy

### Primary Indexes
- All primary keys (UUID fields)
- All foreign key relationships
- User email fields (unique within tenant)
- License plates (unique within tenant)
- Pass numbers (unique within tenant)

### Performance Indexes
```sql
-- Gate access performance
CREATE INDEX idx_gate_access_logs_timestamp ON gate_access_logs(timestamp DESC);
CREATE INDEX idx_gate_access_logs_gate_result ON gate_access_logs(gate_id, result, timestamp);

-- Active passes lookup
CREATE INDEX idx_gate_passes_active ON gate_passes(status, valid_from, valid_to)
WHERE status = 'active';

-- Guest visit validation
CREATE INDEX idx_guests_active_visits ON guests(status, visit_date_start, visit_date_end);

-- Construction permit validation
CREATE INDEX idx_construction_permits_active ON construction_permits(status, start_date, end_date);
```

## Data Validation Rules

### Business Logic Constraints
1. **Household-Residence**: Household must have at least one residence
2. **Gate Pass**: Cannot be issued to expired vehicle registration
3. **Guest Visit**: Cannot overlap with existing guest visits for same visitor
4. **Construction Permit**: Must have valid dates and approved before worker passes issued
5. **Election**: Cannot have overlapping nomination and voting periods
6. **User Roles**: Hierarchical permissions enforced at application level

### Multi-Tenant Constraints
- All tenant-scoped queries include tenant_id validation
- Foreign key constraints within tenant schemas only
- No cross-tenant data relationships allowed

## Data Migration Strategy

### Tenant Provisioning Process
1. Create new tenant schema from template
2. Initialize default data (gates, settings)
3. Create admin accounts from platform invitation
4. Set up initial audit logging configuration

### Schema Evolution
- All migrations run in tenant context
- Version tracking per tenant for rollback capability
- Zero-downtime migrations using blue-green deployment

This data model supports all constitutional requirements including multi-tenant isolation, role-based access control, household-centric design, and comprehensive audit logging.