# ForgeQuote™ — Manufacturing Quotation Engineering Platform

> **Production-grade, auditable quotation lifecycle system for discrete manufacturing.** Built with a deterministic costing engine, effective-dated rate masters, AI-assisted intake & review, multi-role departmental governance, and tamper-evident audit logging.

[![CI Pipeline](https://github.com/forgecode/forgequote/actions/workflows/ci.yml/badge.svg)](https://github.com/forgecode/forgequote/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/postgresql-15%2B-blue.svg)](https://www.postgresql.org/)

---

## 🌐 Live Deployments

| Component | Platform | Live URL | Health Status |
| :--- | :--- | :--- | :--- |
| **Frontend Application** | Vercel | [https://forge-quote-bice.vercel.app](https://forge-quote-bice.vercel.app) | Production Active |
| **Backend API Service** | Render | [https://forgequote-7xo3.onrender.com](https://forgequote-7xo3.onrender.com) | Production Active |
| **Database & Pooling** | Supabase | `aws-0-eu-west-1.pooler.supabase.com:5432` | SSL Encrypted IPv4 Pooler |

---

## 🏭 What is ForgeQuote?

In custom precision machining, fabrication, and aerospace manufacturing (AS9100 / ISO 9001), quotations are high-stakes financial commitments. Traditional spreadsheets introduce pricing drift, unvetted machine rates, stale material indices, and zero auditability.

**ForgeQuote** establishes a structured, auditable quotation progression:
1. **Intake**: Multi-format customer RFQ ingestion (PDF drawings, Excel BOMs, email text) with AI assistance.
2. **Estimation**: Deterministic cost calculations binding effective-dated master rates into immutable revision snapshots.
3. **Plant Head Routing**: Manufacturing feasibility verification, machine allocation, cycle time inspection, and return/approval loops.
4. **Sales Head Commercial Review**: Margin verification, customer commercial terms, and final executive sign-off.
5. **Issuance**: Formal quotation PDF document generation with snapshot reuse, cryptographic integrity, and persistent audit logs.

---

## 🧠 System Architecture & Workflow

```mermaid
flowchart TD
    A["Customer RFQ<br/>(PDF, Excel, Email)"] --> B["AI RFQ Intake & Extraction<br/>(Groq LLM Advisory)"]
    B --> C["Estimator Verification & RFQ Register"]
    C --> D["Cost Estimation Workspace<br/>(Deterministic Formula Engine)"]
    D -->|"Lock Rate Snapshots"| E["Immutable Costing Revision (Draft)"]
    E -->|"Submit for Review"| F["Plant Head Routing Review"]
    F -->|"Changes Requested"| D
    F -->|"Approved"| G["Sales Head Commercial Review"]
    G -->|"Changes Requested"| D
    G -->|"Approved"| H["Formal Quotation Approved"]
    H -->|"Generate PDF"| I["Quotation Issued & Immutable PDF Stored"]
    
    subgraph Governance & Defense
        J["Effective-Dated Rate Masters"] -.-> D
        K["AI Advisory Review Assistance"] -.-> D
        K -.-> F
        K -.-> G
        L["Tamper-Evident Persisted Audit Log"] <--- C
        L <--- E
        L <--- F
        L <--- G
        L <--- I
    end
```

---

## ⚡ Key Capabilities & Technical Features

### 1. Deterministic Costing Engine
- Eliminates pricing drift by capturing immutable rate snapshots (material price per kg, machine hour rates, scrap recovery credits, overhead percentages, packing, freight, and target margin).
- Models annual volume sensitivity scenarios (`100 pcs`, `500 pcs`, `1,200 pcs`, `5,000 pcs`) dynamically.
- Changes after submission trigger a new revision (`v1 -> v2`), keeping prior submissions locked for regulatory compliance.

### 2. Multi-Role Departmental Governance (RBAC)
- **Estimator**: Intake RFQs, configure operations routes, calculate part costs, resubmit requested adjustments.
- **Plant Head**: Inspect sequence of operations, machine hour rates, and cycle times; approve manufacturing feasibility or request engineering corrections.
- **Sales Head**: Inspect commercial margins, high-value thresholds, customer delivery dates, and grant final quotation approval.
- **Administrator**: Oversee system users, manage effective-dated rate schedules, and inspect the enterprise lifecycle audit matrix.

### 3. AI-Assisted Intake & Advisory Reviews (Human-in-the-Loop)
- Powered by Groq's high-throughput LLM inference (`llama-3.3-70b-versatile` / `gpt-oss`).
- **AI RFQ Intake**: Automatically extracts customer reference numbers, due dates, part specifications, material grades, weights, and annual quantities from drawings or inquiry emails.
- **AI Review Assistance**: Performs non-authoritative sanity checks across costing inputs, operations cycle times, and commercial margins, providing evidence citations and ranked severity recommendations.
- **Strict Human Authority**: AI never cost-estimates, selects rates, approves routes, or issues quotations.

### 4. Authoritative PDF Generation & Audit Trail
- Pixel-perfect, high-resolution commercial quotation PDFs generated via **PDFKit**.
- Documents are snapshotted in secure private storage; repeat downloads reuse the immutable snapshot.
- Every state transition, login, revision creation, review approval, return comment, and PDF issuance is written to an append-only PostgreSQL audit log.

### 5. Resilient Cross-Origin Authentication (Dual-Mode)
- Designed for decoupled deployments (`*.vercel.app` frontend and `*.onrender.com` backend).
- Supports standard `HttpOnly` cookie sessions alongside seamless `Authorization: Bearer <token>` fallback to bypass browser third-party cookie restrictions (Safari ITP / Chrome Privacy Sandbox).

### 6. Mobile-First Responsive Interface
- Fully responsive layout tested across 320px–1920px viewports.
- Touch-friendly drawer navigation with body-scroll locking.
- Isolated horizontal data table scrolling preventing layout blowouts on small phones.
- Dark manufacturing aesthetic (`#080808`, `#111111`, `#181818`, `#FF5A1F` orange accents).

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 (SPA)
- **Tooling**: Vite 6, PostCSS, Autoprefixer
- **Styling**: Tailwind CSS 3.4
- **Routing**: React Router DOM 6
- **Icons**: Lucide React
- **Typography**: Space Grotesk (Headings) & DM Sans (Body)

### Backend
- **Runtime**: Node.js 20+
- **Server Framework**: Express 4
- **Database**: PostgreSQL 15+ via `pg` connection pool
- **Authentication**: JWT (`jsonwebtoken`), `cookie-parser`, `bcryptjs`
- **Security**: `cors`, `helmet`, `express-rate-limit`, proxy trust
- **PDF Generation**: `pdfkit`
- **AI Inference**: Groq SDK (`groq-sdk`), `pdf-parse`, `xlsx`

---

## 📁 Repository Structure

```text
ForgeQuote/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI matrix (Node test & Docker buildx)
├── client/                      # React 18 / Vite frontend application
│   ├── public/
│   │   ├── favicon.svg          # Official brand SVG favicon
│   │   └── index.html
│   ├── src/
│   │   ├── app/                 # Router configuration & route guards
│   │   ├── components/
│   │   │   ├── ai/              # AiReviewPanel & advisory widgets
│   │   │   ├── data-display/    # RfqTable, StatusBadge
│   │   │   ├── feedback/        # States (Loading, Empty, Error)
│   │   │   ├── landing/         # LandingHeader, Hero, LaptopMockup, Footer
│   │   │   └── ui/              # Logo, Button, MarkdownRenderer
│   │   ├── features/
│   │   │   ├── aiIntake/        # AI RFQ Intake form & verification
│   │   │   ├── audit/           # Audit trail history viewer
│   │   │   ├── commercial/     # Sales Head commercial review queue
│   │   │   ├── costing/         # Cost Estimation Workspace & Scenarios
│   │   │   ├── dashboard/       # Role-specific workspaces & AdminLifecycleTable
│   │   │   ├── quotations/      # Quotation history & PDF download
│   │   │   ├── rates/           # Rate Masters management
│   │   │   ├── rfqs/            # RFQ Register & creation forms
│   │   │   ├── routing/         # Plant Head routing reviews
│   │   │   └── users/           # Administrator user management
│   │   ├── layouts/             # DashboardLayout (mobile drawer) & PublicLayout
│   │   ├── lib/                 # Dual-mode API client & file download utilities
│   │   ├── pages/               # LandingPage, LoginPage, NotFoundPage
│   │   └── styles/              # Tailwind CSS entries & responsive resets
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                      # Express / Node.js backend API
│   ├── migrations/              # 13 ordered PostgreSQL schema migrations
│   ├── private-documents/       # Isolated storage for drawings and issued PDFs
│   ├── scripts/                 # Database migration & synthetic seed runners
│   ├── src/
│   │   ├── config/              # Database pool & environment loader
│   │   ├── modules/             # Monolithic business boundaries
│   │   │   ├── aiIntake/        # Document text parser & Groq intake extraction
│   │   │   ├── aiReview/        # AI domain review validations
│   │   │   ├── audit/           # Persistent audit event dispatcher
│   │   │   ├── auth/            # JWT authentication & session controller
│   │   │   ├── commercialReviews/# Commercial approval & margin rules
│   │   │   ├── costing/         # Deterministic costing revision engine
│   │   │   ├── customers/       # Customer directory
│   │   │   ├── dashboard/       # Workspace aggregates & lifecycle metrics
│   │   │   ├── quotations/      # Quotation approval, issuance, & PDF engine
│   │   │   ├── rateMasters/     # Effective-dated rates repository
│   │   │   ├── rfqDocuments/    # Protected document upload & retrieval
│   │   │   ├── rfqs/            # RFQ lifecycle & part registry
│   │   │   ├── routingReviews/  # Manufacturing route approval workflow
│   │   │   └── users/           # User RBAC service
│   │   ├── shared/              # Global auth middleware, errors, & validation
│   │   ├── app.js               # Express application initialization & middleware
│   │   └── server.js            # Server entrypoint & graceful shutdown
│   ├── tests/                   # Jest / Supertest integration test suite
│   └── package.json
├── deployment.md                # Detailed production deployment runbook
├── Dockerfile                   # Multi-stage production container definition
├── package.json                 # Monorepo workspace root package.json
└── README.md
```

---

## 🔑 Demo Accounts & Pre-Seeded Roles

ForgeQuote includes synthetic demo credentials across all four departmental roles:

| Role | Email Address | Default Password | Workspace Responsibilities |
| :--- | :--- | :--- | :--- |
| **Estimator** | `estimator@forgequote.test` | `ForgeQuote123!` | RFQ Intake, costing calculations, operational routing |
| **Plant Head** | `plant.head@forgequote.test` | `ForgeQuote123!` | Machining feasibility, cycle time review, route return/approval |
| **Sales Head** | `sales.head@forgequote.test` | `ForgeQuote123!` | Commercial margin verification, customer terms, quotation approval |
| **Administrator** | `admin@forgequote.test` | `ForgeQuote123!` | User governance, Rate Masters schedules, enterprise audit log |

---

## ⚙️ Environment Variables

### Backend (`server/.env` or root `.env`)

| Variable | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | Port for the Express API server | `4000` |
| `NODE_ENV` | Yes | Application environment | `development` or `production` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | Yes | 32+ char secret for signing JWTs | `openssl rand -hex 32` |
| `CLIENT_ORIGIN` | Yes | Allowed frontend origin for CORS | `https://forge-quote-bice.vercel.app` |
| `COOKIE_SECURE` | Yes | Set `true` behind HTTPS; `false` locally | `true` |
| `GROQ_API_KEY` | Optional | API key for AI intake & review | `gsk_...` |
| `GROQ_MODEL` | Optional | Groq model identifier | `llama-3.3-70b-versatile` |
| `COMPANY_NAME` | Yes | Legal company name for quotation PDFs | `ForgeQuote Manufacturing Pvt. Ltd.` |
| `COMPANY_ADDRESS` | Yes | Company address for quotation PDFs | `Sector 5, Industrial Area, Kolkata` |
| `QUOTATION_TAX_RATE`| Yes | Applicable tax percentage on quotes | `18` |
| `QUOTATION_VALIDITY_DAYS` | Yes | Number of days quote remains valid | `30` |
| `PRIVATE_DOCUMENTS_DIR` | Optional | Directory for drawings & PDFs | `./server/private-documents` |

### Frontend (`client/.env`)

| Variable | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | Yes | Base URL pointing to the Express `/api` | `https://forgequote-7xo3.onrender.com/api` |

---

## 🚀 Running Locally

### Prerequisites
- **Node.js**: `20.x` or higher
- **npm**: `10.x` or higher
- **PostgreSQL**: `15.x` or higher (or cloud PostgreSQL like Supabase / Neon)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/ForgeQuote.git
cd ForgeQuote
```

### 2. Install Dependencies
```bash
# Install root, server, and client dependencies in one command
npm install
```

### 3. Configure Environment
Copy `.env.example` to root or `server/.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL`, `JWT_SECRET`, and company metadata are set.

### 4. Run Migrations & Seed Demo Data
```bash
# Run the 13 PostgreSQL schema migrations in order
npm run migrate

# Seed synthetic test users, rate masters, sample RFQs, and costing revisions
npm run seed
```

### 5. Start the Development Servers
```bash
# Starts both Express backend (port 4000) and Vite frontend (port 5173) concurrently
npm run dev
```

Visit **`http://localhost:5173`** to access the web application.

---

## 🧪 Testing & Validation

```bash
# Run backend integration & smoke tests (74 tests across 14 test suites)
npm test

# Run frontend production build
npm --prefix client run build
```

---

## 📦 Deployment

ForgeQuote is deployed using:
- **Render Web Service** for the Node.js / Express API.
- **Vercel** for the React / Vite Single Page Application.
- **Supabase PostgreSQL** for the relational data store and document metadata.

For complete step-by-step production setup, SSL connection pooler details, CORS configuration, and third-party cookie mitigation, read **[deployment.md](deployment.md)**.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
