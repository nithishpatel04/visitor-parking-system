# SentinelOps Security Operations Suite

Standalone AWS serverless Security Operations application with visitor parking control, incident management, shift logging, dashboard analytics, notifications, and role-based access control.

## Features

✅ **Dashboard**: Security operations summary, parking trend chart, incident breakdown chart, and recent activity  
✅ **Visitor Parking**: Create new passes with automatic 10-day monthly limit enforcement  
✅ **Incident Reports**: Draft, submit, view, and attach AWS S3 files to incident reports  
✅ **Security Shift Logs**: Draft and submit operational shift reports with security checks  
✅ **Admin Console**: Grant exceptions to Site+Unit combinations  
✅ **Professional Print**: 80mm thermal receipt format with security seal and validity box  
✅ **Role-Based Access**: Concierge, Manager, and Admin roles with permission enforcement  
✅ **Multi-Device Support**: Cloud-based sessions with per-device authentication  
✅ **Cloud Ready**: AWS Lambda, API Gateway, DynamoDB, and S3-backed storage  

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (no frameworks)
- **Backend**: Node.js on AWS Lambda with Express-style routing
- **Database**: DynamoDB (AWS) / JSON file (local)
- **Object Storage**: Amazon S3 for incident attachments
- **Authentication**: Token-based sessions with role management
- **Deployment**: AWS Lambda, API Gateway, DynamoDB

## Local Development

### Prerequisites
- Node.js 18+ installed
- AWS SDK (auto-installed via npm)

### Setup

1. **Clone/Download the project**
   ```bash
   cd e:\visitor-parking-system
   ```

2. **Install dependencies**
   ```bash
   cd server
   npm install
   cd ..
   ```

3. **Run locally (file-based storage)**
   ```bash
   cd server
   node server.js
   ```
   
   Open: http://localhost:3000/login.html

### Demo Credentials

```
Concierge:   concierge / 1234  (Can create passes, see dashboard)
Manager:     manager / 1234    (Can create passes, see dashboard)
Admin:       admin / 1234      (Can create passes, manage exceptions)
```

## Project Structure

```
visitor-parking-system/
├── client/                          # Frontend files
│   ├── index.html                  # Security operations dashboard
│   ├── parking.html                # Visitor parking form
│   ├── incidents.html              # Incident reports
│   ├── shift-logs.html             # Security shift logs
│   ├── admin.html                  # Admin console
│   ├── print.html                  # Print receipt
│   ├── login.html                  # Login page
│   ├── js/                         # Frontend logic
│   └── css/                        # Styling
├── server/
│   ├── server.js                   # Main HTTP server
│   ├── package.json                # Node dependencies
│   ├── middleware/
│   │   └── cors.js                # CORS handling
│   ├── routes/
│   │   ├── authRoutes.js          # Login/logout endpoints
│   │   ├── parkingRoutes.js       # Pass CRUD endpoints
│   │   ├── incidentRoutes.js      # Incident report endpoints
│   │   ├── shiftLogRoutes.js      # Shift log endpoints
│   │   ├── dashboardRoutes.js     # Dashboard summary endpoints
│   │   └── adminRoutes.js         # Admin endpoints
│   ├── controllers/
│   │   ├── parkingController.js   # Business logic for passes
│   │   ├── incidentController.js  # Incident reports and attachments
│   │   ├── shiftLogController.js  # Shift logs
│   │   ├── dashboardController.js # Dashboard analytics
│   │   └── adminController.js     # Business logic for admin
│   ├── services/
│   │   ├── storage.js             # Data persistence
│   │   ├── authService.js         # Session management
│   │   ├── exceptionService.js    # 10-day limit exceptions
│   │   ├── passCounter.js         # Monthly usage counting
│   │   ├── authorization.js      # Session/role checks
│   │   ├── s3.js                 # Presigned attachment URLs
│   │   └── config/dynamodb.js    # DynamoDB client (AWS)
│   └── config/
│       └── dynamodb.js            # DynamoDB configuration
├── .env.example                    # Environment variables template
├── Dockerfile                      # Container configuration
├── AWS-DEPLOYMENT-GUIDE.md        # Step-by-step AWS setup
└── README.md                      # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/logout` - Logout and destroy session
- `GET /api/auth/verify` - Verify valid token

### Parking Passes
- `GET /api/passes` - List all passes (with filters)
- `POST /api/passes` - Create new parking pass
- `DELETE /api/passes/:id` - Delete a pass

### Dashboard
- `GET /api/dashboard/summary` - Dashboard summary cards and recent activity
- `GET /api/dashboard/parking-trend` - Last 7 days of parking pass volume
- `GET /api/dashboard/incident-breakdown` - Incident totals by type

### Security Operations
- `GET /api/shift-logs` - List shift logs
- `GET /api/shift-logs/:id` - Read a shift log
- `POST /api/shift-logs` - Create a shift log draft
- `PUT /api/shift-logs/:id` - Update a shift log draft
- `POST /api/shift-logs/:id/submit` - Submit a shift log
- `GET /api/incidents` - List incident reports
- `GET /api/incidents/:id` - Read an incident report
- `POST /api/incidents` - Create an incident report draft
- `PUT /api/incidents/:id` - Update an incident report draft
- `POST /api/incidents/:id/submit` - Submit an incident report
- `POST /api/incidents/:id/attachment-upload-url` - Generate a presigned S3 upload URL
- `GET /api/incidents/:id/attachment-download-url` - Generate a presigned S3 download URL
- `GET /api/notifications` - List unread and recent notifications
- `GET /api/notifications/count` - Notification count
- `POST /api/notifications/:id` - Mark a notification read

### Admin
- `GET /api/admin/units` - Get monthly usage by unit
- `POST /api/admin/exceptions/:building/:unit` - Grant/revoke exception

## Business Rules

### 10-Day Monthly Limit
- Each Building + Unit can have max 10 overnight parking days per month
- Counted by `duration` field (0 = day-time, excluded from count)
- Admin can grant 1-7 day exceptions with expiration timestamps

### Day-time Parking
- Duration = 0 sets end date to 11:59 PM same day
- Not counted toward 10-day limit
- Perfect for visitors parking a few hours

### Role Permissions
- **Concierge**: Create passes, view dashboard (no admin access)
- **Manager**: Create passes, view dashboard (no admin access)
- **Admin**: Create passes, view dashboard, manage exceptions

## Deployment

### Local Testing
```bash
node server/server.js
# Visit http://localhost:3000/login.html
```

### AWS Deployment
Follow the comprehensive guide in [AWS-DEPLOYMENT-GUIDE.md](AWS-DEPLOYMENT-GUIDE.md)

**Quick Summary:**
1. Create DynamoDB tables for passes, sessions, exceptions, shift logs, incident reports, and notifications
2. Create an S3 bucket for incident attachments
3. Configure `AWS_REGION`, `INCIDENT_ATTACHMENTS_BUCKET`, and Lambda IAM permissions
4. Deploy code to Lambda
5. Create API Gateway
6. Update client API endpoint
7. Test login, parking, incident reports, and shift logs

**Cost**: ~$0-5/month for small usage

## Database Schema

### `parking-passes` Table
```
{
  id: String (PK),
  building: String,
  unit: String,
  resident: String,
  plate: String,
  vehicle: String,
  color: String,
  duration: Number (0-3),
  authorizedBy: String,
  createdAt: ISO8601,
  startDate: YYYY-MM-DD,
  endDate: ISO8601,
  ttl: Number (Unix timestamp)
}
```

### `parking-sessions` Table
```
{
  token: String (PK),
  userId: Number,
  username: String,
  role: String,
  name: String,
  createdAt: Number (timestamp),
  ttl: Number (Unix timestamp - 24h)
}
```

### `parking-exceptions` Table
```
{
  id: String (PK: "building::unit"),
  building: String,
  unit: String,
  enabled: Boolean,
  days: Number,
  reason: String,
  expiresAt: ISO8601,
  createdAt: ISO8601,
  ttl: Number (Unix timestamp)
}
```

### `shift-logs` Table
```
{
  id: String (PK),
  title: String,
  building: String,
  shiftDate: YYYY-MM-DD,
  shiftType: String,
  officerName1: String,
  officerName2: String,
  shiftStartTime: HH:MM,
  shiftEndTime: HH:MM,
  securityChecks: Object,
  reportText: String,
  status: String,
  submissionDateTime: ISO8601,
  ttl: Number (Unix timestamp)
}
```

### `incident-reports` Table
```
{
  id: String (PK),
  title: String,
  incidentType: String,
  unitAffected: String,
  submittedBy: String,
  officersInvolved: String,
  reportText: String,
  attachment: Object,
  status: String,
  submissionDateTime: ISO8601,
  viewedDateTime: ISO8601,
  ttl: Number (Unix timestamp)
}
```

### `notifications` Table
```
{
  id: String (PK),
  type: String,
  incidentId: String,
  title: String,
  incidentType: String,
  unitAffected: String,
  submittedBy: String,
  submissionDateTime: ISO8601,
  read: Boolean,
  readDateTime: ISO8601
}
```

## Browser Support

✅ Chrome/Edge 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Dashboard Load**: <500ms
- **API Response**: <200ms (local) / <500ms (AWS)
- **Print Page**: <300ms
- **Database Queries**: Optimized with proper indexing

## Security Considerations

### Current (Demo)
- Plain text passwords (demo only)
- Token stored in localStorage
- Basic CORS headers

### Production Recommendations
1. Use bcrypt for password hashing
2. Store tokens in secure HTTP-only cookies
3. Add rate limiting to login endpoint
4. Use JWT with signatures
5. Enable AWS WAF on API Gateway
6. Encrypt DynamoDB data at rest
7. Enable MFA for AWS access
8. Use VPC endpoints for DynamoDB

## Troubleshooting

### Error: "Cannot find module 'fs'"
- Only occurs when running on Lambda - use AWS SDK instead
- Should be auto-handled by `dynamodb.js` config

### Error: "10-day limit reached"
- Admin must grant exception in Admin Console
- Exception expires after configured days
- Create new exception to grant more days

### Error: "Failed to fetch"
- Check API endpoint URL in `client/js/api.js`
- Verify CORS headers on API Gateway
- Ensure Lambda function is deployed

## Performance Optimization Ideas

1. Add caching layer (Redis)
2. Implement pagination for large result sets
3. Add search indexing for pass lookup
4. Compress static assets
5. Enable CloudFront CDN for client files
6. Add database connection pooling

## Future Enhancements

- Email notifications for pass expiry
- SMS alerts for visitors
- QR code on parking pass
- Payment integration for extra days
- Analytics dashboard
- Automatic renewal system
- Integration with parking sensors
- Mobile app (React Native)

## BRD Prompt (Standalone Security Operations App)

Use this prompt with ChatGPT/Copilot to generate a complete Business Requirements Document for this project:

```text
Create a complete, professional Business Requirements Document (BRD) for a standalone application named "SentinelOps Security Operations Suite" (also acceptable: "Security Command Center"). Position it as a dedicated Security Operations product for a multi-site security company, not as an enhancement of a parking app.

Context and scope:
- Organization manages security operations across multiple client properties, facilities, and sites.
- Application modules: Login/Auth, Dashboard Analytics, Visitor Parking, Incident Reports, Security Shift Logs, Notifications, Admin Exception Management, and Print Pass.
- Cloud architecture is AWS-only: API Gateway + Lambda + DynamoDB + S3 (no Firebase/Supabase/other cloud migration).
- Frontend is static HTML/CSS/JavaScript hosted on GitHub Pages; backend is Node.js serverless APIs.
- User roles: Concierge, Manager, Admin.

Produce a BRD with the following structure and depth:
1) Executive Summary
2) Business Objectives and Success Criteria (with measurable KPIs)
3) Current Challenges / Problem Statement
4) In Scope vs Out of Scope
5) Stakeholders and RACI Matrix
6) User Personas and Role Permissions
7) End-to-End Business Processes and Workflows
  - Visitor parking pass lifecycle (create, validate limits, print, expire)
  - Incident report lifecycle (draft, submit, management view, attachment handling)
  - Shift log lifecycle (draft, submit, archive)
  - Admin exception lifecycle (grant/revoke/expiry/history)
8) Functional Requirements (module-wise)
  - Authentication and session behavior
  - Dashboard analytics cards/charts/recent activity
  - Parking pass rules (10-day monthly overnight limit, day-time duration=0)
  - Incident reporting with S3 attachments
  - Shift logs and security checks
  - Notification center and read/unread management
  - Admin console operations
  - Print format and compliance requirements
9) Business Rules and Validation Rules
10) Non-Functional Requirements
  - Performance, availability, scalability, security, auditability, usability, accessibility
11) Data Requirements
  - Logical data model, key entities, field-level definitions
  - Data retention and archival expectations
12) Reporting and Analytics Requirements
13) Integration Requirements (AWS services and any external dependencies)
14) Security and Compliance Requirements
15) Assumptions, Constraints, and Dependencies
16) Risks and Mitigation Plan
17) Implementation Roadmap (phased), milestones, and rough effort estimates
18) UAT Acceptance Criteria and Test Scenarios
19) Post-deployment Operations and Support Model
20) Appendix
  - Glossary
  - API capability summary mapped to business requirements

Important requirements for writing style:
- Write in formal business language suitable for management and technical teams.
- Include requirement IDs (e.g., FR-001, NFR-001, BR-001).
- For each functional requirement, include: description, priority (Must/Should/Could), rationale, and acceptance criteria.
- Include at least 20 concrete acceptance criteria across modules.
- Include at least 10 measurable KPIs with target values.
- Provide workflow diagrams in Mermaid format for major processes.
- Clearly preserve AWS-only deployment direction.
```

Tip: Save the output as `BRD_PROPOSAL.md` and review with operations, admin, and management stakeholders before implementation sign-off.

## License

MIT License - Free to use and modify

## Support

For issues or questions:
1. Check AWS-DEPLOYMENT-GUIDE.md
2. Review API endpoints documentation
3. Check browser console for errors
4. Verify DynamoDB table configuration

---

**Built with ❤️ for seamless parking management**
