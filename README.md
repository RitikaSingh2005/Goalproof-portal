# GoalProof Portal

GoalProof Portal is a full-stack performance management and goal-tracking web application. It connects employees, managers, and administrators through structured goal setting, automated SMART evaluations, manager approval workflows, quarterly check-in cycles, and organizational analytics.

---

## 1. Project Overview

GoalProof Portal streamlines performance review cycles inside organizations. Employees set goals with measurable key performance indicators (KPIs) and receive immediate AI feedback on SMART criteria. Managers review, edit, approve, or reject submitted goals and track team performance trends. Administrators configure quarterly performance cycles, distribute organization-wide KPIs, inspect audit logs, and export reports.

---

## 2. Architecture

The application is structured as a decoupled client-server architecture:

```text
GoalProof-portal/
├── backend/
│   ├── config/               # Centralized environment variable validation (env.js)
│   ├── controllers/          # Business logic (auth, goals, checkin, manager, admin, ai)
│   ├── docs/                 # OpenAPI 3.0 specification for Swagger UI
│   ├── middleware/           # Auth, RBAC, error handling, rate limiting, request validation
│   ├── prisma/               # Prisma schema, migrations, seed scripts, client singleton
│   ├── routes/               # Express route declarations with express-validator
│   ├── tests/                # Automated Vitest + Supertest integration tests
│   ├── utils/                # Standardized response and error format helpers
│   ├── server.js             # Express application initialization and middleware
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Shared UI components (CircularMeter, ProfileModal, Layout)
│   │   ├── context/          # React AuthContext for authentication state
│   │   ├── pages/            # Views (Login, Register, Employee, Manager, Admin dashboards)
│   │   ├── services/         # Axios API client with standardized interceptors
│   │   ├── App.jsx           # React Router route configuration with ProtectedRoute
│   │   └── main.jsx          # Frontend entry point
│   ├── vite.config.js        # Vite bundler configuration
│   └── package.json
└── README.md
```

---

## 3. Tech Stack

* **Frontend:** React 18, Vite, React Router 6, Axios, Tailwind CSS, Recharts, Framer Motion, React Hot Toast, Lucide React
* **Backend:** Node.js (ES Modules), Express 4, Prisma ORM 6, SQLite, Helmet, Express Rate Limit, Swagger UI Express, bcryptjs, jsonwebtoken, OpenAI SDK
* **Testing:** Vitest, Supertest
* **Database:** SQLite (managed via Prisma ORM)

---

## 4. Features

### Employee Portal
* **Goal Setting:** Draft up to 8 goals with thrust areas, unit of measurement (Numeric, Percentage, Timeline), target values, and individual weightages (10% to 100%).
* **AI SMART Scoring:** Real-time feedback scoring (0–100) assessing Specific, Measurable, Achievable, Relevant, and Time-bound criteria.
* **Submission Workflow:** Validates that total goal weightage equals exactly 100% before submission to manager.
* **Quarterly Check-in:** Log actual achievement progress during open performance cycles with AI anomaly verification and progress capped at 150%.
* **Progress & History:** Track multiple check-ins over time with interactive charts.

### Manager Portal
* **Pending Approvals Queue:** Review submitted goals with visual alerts for stale goals (>14 days without update) or target-progress mismatches.
* **Goal Modification:** Reviewers can edit targets, weightages, or thrust areas directly before approving.
* **Team Analytics:** Inspect team completion averages, risk levels (On Track, At Risk, Critical), and status distribution.
* **Attention Score:** Metrics tracking manager response rates to submitted items.
* **Feedback:** Add comments and performance notes directly to direct reports.

### Admin Portal
* **Organization Intelligence:** Department-level SMART score averages, goal abandonment rates, and manager effectiveness rankings.
* **Cycle Management:** Create, activate, edit, and complete performance review cycles with date boundary enforcement.
* **Shared KPIs:** Create master organizational KPIs and bulk-assign them to employees.
* **Emergency Overrides:** Unlock locked or rejected goals with mandatory justification for audit compliance.
* **Audit Trail:** Query system audit logs recording authentication, goal actions, check-ins, and overrides.
* **CSV Export:** Download complete organization-wide goal and progress reports.

---

## 5. Authentication

Authentication uses stateless JSON Web Tokens (JWT) signed with HMAC-SHA256:
* User passwords are encrypted using `bcryptjs` with 10 salt rounds.
* On registration or login, the server issues a signed JWT containing user ID, role, name, and email with a 1-day expiration.
* The frontend stores the token in `localStorage` and automatically attaches it via an Axios request interceptor (`Authorization: Bearer <token>`).
* Missing or expired tokens are rejected with HTTP 401.

---

## 6. Role-Based Access Control (RBAC)

The portal enforces three distinct roles:
1. **Employee (`employee`):** Can manage own goals, submit goals, perform quarterly check-ins during open cycles, and view personal history.
2. **Manager (`manager`):** Can perform all employee actions, plus review, edit, approve, or reject goals of their direct reports, view team analytics, and provide check-in feedback.
3. **Admin (`admin`):** Full access to cycle management, shared organization KPIs, audit logs, employee directory, emergency overrides, and report exports.

Authorization is enforced at both the route level (via `authorize(['role'])` middleware) and database query level (verifying ownership or manager-employee relationships).

---

## 7. REST APIs

All API endpoints return consistent JSON responses:

* **Success Response Format:**
  ```json
  {
    "success": true,
    "message": "Resource retrieved successfully",
    "data": { ... }
  }
  ```

* **Error Response Format:**
  ```json
  {
    "success": false,
    "message": "Descriptive error message",
    "errorCode": "ERROR_CODE"
  }
  ```

* **Validation Failure Format (HTTP 400):**
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [
      "Title is required",
      "Weightage must be between 10% and 100%"
    ]
  }
  ```

### Primary Endpoints Summary:
* `POST /api/auth/register` — Register user
* `POST /api/auth/login` — Login user
* `GET /api/auth/me` — Current user profile
* `GET /api/goals` — Fetch user goals
* `POST /api/goals` — Create draft goal
* `PUT /api/goals/:id` — Update own draft/rejected goal
* `DELETE /api/goals/:id` — Delete draft/rejected goal
* `POST /api/goals/submit-all` — Submit goals for approval (100% total weightage required)
* `GET /api/goals/shared` — Fetch assigned shared organization goals
* `GET /api/checkin/active` — Active cycle check-in window status
* `POST /api/checkin` — Submit quarterly achievement check-in
* `GET /api/checkin/history` — Check-in history
* `GET /api/manager/pending` — Goals awaiting manager approval
* `GET /api/manager/team` — Manager team progress analytics
* `GET /api/manager/attention-score` — Review responsiveness score
* `PUT /api/manager/goals/:id/approve` — Approve goal
* `PUT /api/manager/goals/:id/reject` — Reject goal
* `PUT /api/manager/goals/:id/edit` — Edit goal prior to approval
* `POST /api/manager/checkin/:employeeId` — Submit manager comment
* `POST /api/admin/cycles` — Create and activate performance cycle
* `GET /api/admin/cycles` — List all cycles
* `PUT /api/admin/cycles/:id` — Update cycle dates and status
* `GET /api/admin/insights` — Organization intelligence metrics
* `GET /api/admin/shared-analytics` — Shared KPI performance metrics
* `GET /api/admin/audit-log` — Recent system audit logs
* `GET /api/admin/report` — Download CSV report
* `PUT /api/admin/goals/:id/unlock` — Emergency goal unlock
* `GET /api/admin/employees` — Employee list for assignments
* `POST /api/admin/shared-goal` — Bulk-assign master organization KPI
* `POST /api/ai/smart-score` — Evaluate goal on SMART criteria
* `POST /api/ai/verify-achievement` — Verify realistic achievement threshold

---

## 8. Prisma / Database

Database access uses Prisma ORM with SQLite:
* `User`: Stores credentials, role (`employee`, `manager`, `admin`), department, and self-referencing `manager_id`.
* `Goal`: Stores title, thrust area, UOM type (`Numeric`, `Percentage`, `Timeline`), target value, weightage (10-100), status (`draft`, `pending`, `approved`, `rejected`, `locked`), SMART score, progress, and shared KPI metadata.
* `Cycle`: Performance cycle definition with `name`, `start_date`, `end_date`, and `status` (`active`, `completed`, `draft`).
* `Achievement`: Historical progress submission records storing `quarter`, `year`, `actual_value`, `status`, `progress_score`, `description`, and submission timestamps.
* `Comment`: Manager feedback linked to specific employee check-ins.
* `AuditLog`: Action tracking storing `action`, `user_id`, `details`, and `timestamp`.

---

## 9. AI Integration

The backend integrates with the OpenAI API (`gpt-3.5-turbo`) for two core capabilities:
1. **SMART Evaluation:** Evaluates goal titles against Specific, Measurable, Achievable, Relevant, and Time-bound dimensions and returns a numeric score with constructive suggestions.
2. **Achievement Verification:** Detects potential data entry errors or anomalous achievements relative to targets during check-in submissions.

If `OPENAI_API_KEY` is not configured, the endpoints safely return an HTTP 503 configuration error (`AI_NOT_CONFIGURED`) rather than failing silently or returning mock output. In automated tests, the OpenAI client is cleanly mocked.

---

## 10. Check-in Cycle System

Check-in submission requires an active performance cycle:
1. The employee initiates a check-in.
2. The server queries the database for a cycle with `status: 'active'` whose `start_date` and `end_date` encompass the current date.
3. If no active cycle matches, the request is rejected with HTTP 403: `"Check-in window is currently closed"`.
4. If an active cycle exists, the server confirms that the goal belongs to the requesting user and has status `'approved'`.
5. Progress is calculated based on the goal's unit of measurement (Numeric/Percentage: `actual / target * 100`, Timeline: completed status checks), capped at a maximum of 150%.
6. An `Achievement` record is saved, preserving historical data across quarters.

---

## 11. API Testing

Automated integration tests are implemented with **Vitest** and **Supertest** running in ES Module mode. Tests execute against an isolated test SQLite database (`backend/prisma/test.db`), ensuring production and local data remain untouched.

### Test Coverage (31 Integration Tests):
* **Authentication (Tests 1–7):** Registration, duplicate emails, email format validation, password length checks, valid login, invalid password rejection, and missing token handling.
* **Goals (Tests 8–16):** Authenticated fetch, unauthenticated rejection, valid creation, input validation, editing own goals, cross-user modification prevention, deleting draft goals, full weightage submission validation, and weightage sum rejection.
* **Manager (Tests 17–20):** Pending queue retrieval, goal approval, goal rejection, and employee access restriction (403).
* **Check-in & Cycles (Tests 21–25):** Active cycle validation, inactive cycle rejection (403), unapproved goal rejection, non-numeric input validation, and Achievement record persistence with 150% progress cap.
* **Admin & RBAC (Tests 26–28):** Admin access verification, employee restriction (403), and manager restriction (403).
* **AI Endpoints (Tests 29–31):** Authenticated evaluation access, missing input validation (400), and missing API key error handling (503).

---

## 12. Swagger / OpenAPI Documentation

Interactive OpenAPI 3.0 documentation is served by the backend via Swagger UI:
* **Development Documentation URL:** `http://localhost:5000/api/docs`
* Includes schemas, parameters, sample requests, responses, and Bearer token authentication testing.

---

## 13. Security Hardening

* **Helmet:** Configures standard HTTP response security headers.
* **Rate Limiting:**
  * Authentication endpoints (`/api/auth/*`): 50 requests per 15 minutes.
  * AI endpoints (`/api/ai/*`): 60 requests per 15 minutes.
  * General API endpoints: 1,000 requests per 15 minutes.
* **CORS:** Restricted origin whitelist with support for custom origins via `FRONTEND_URL`.
* **Zero Secrets in Code:** Fallback secrets such as `"supersecret"` have been removed. The backend validates `JWT_SECRET` during startup and aborts if missing.
* **Safe Error Handling:** Stack traces and internal filesystem paths are never returned in HTTP responses.
* **Data Sanitization:** Passwords and keys are never logged in request logging or audit records.

---

## 14. Local Setup

### Prerequisites
* Node.js 18+ (tested on Node 20 and Node 24)
* npm 9+

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone <repo-url>
cd Goalproof-portal-main

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

```bash
# In backend/
copy .env.example .env

# In frontend/
copy .env.example .env
```

Edit `backend/.env` with your desired configuration:
```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_secure_random_jwt_secret_key_here
OPENAI_API_KEY=your_optional_openai_key_here
NODE_ENV=development
```

### 3. Initialize Database & Seed Demo Data

```bash
cd backend
npx prisma db push
npm run seed
```

This creates initial users:
* **Admin:** `admin@goalproof.com` / `password123`
* **Manager:** `manager@goalproof.com` / `password123`
* **Employee:** `employee@goalproof.com` / `password123`

---

## 15. Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `5000` | HTTP port for Express server |
| `DATABASE_URL` | Yes | `"file:./dev.db"` | Prisma SQLite database connection string |
| `JWT_SECRET` | Yes | *None (Fails if missing)* | Secret key used to sign and verify JWTs |
| `OPENAI_API_KEY`| No | *None* | OpenAI API key for SMART evaluation and checkin verification |
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`) |
| `FRONTEND_URL` | No | *None* | Optional custom frontend origin for CORS |

### Frontend (`frontend/.env`)
| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | No | `http://localhost:5000/api` | Base URL for backend API requests |

---

## 16. Test Commands

Run the automated integration test suite in the backend:

```bash
cd backend
npm test
```

To run a specific test suite:
```bash
cd backend
npx vitest run tests/auth.test.js
npx vitest run tests/goals.test.js
npx vitest run tests/manager.test.js
npx vitest run tests/checkin.test.js
npx vitest run tests/admin.test.js
npx vitest run tests/ai.test.js
```

---

## 17. Build Commands

### Frontend Production Build
```bash
cd frontend
npm run build
```
Production assets are generated in `frontend/dist/`.

### Run Development Servers
```bash
# Start backend server
cd backend
npm run dev
# or npm start

# Start frontend development server
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.
Open `http://localhost:5000/api/docs` to view the API documentation.
