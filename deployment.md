# ForgeQuote™ — Production Deployment Runbook

> **Complete operational guide for deploying ForgeQuote across Vercel (Frontend), Render (Backend API), and Supabase (Managed PostgreSQL).**

---

## 🏗️ Production Architecture Overview

ForgeQuote is deployed as a high-performance decoupled architecture:

```mermaid
flowchart LR
    User(["Client Browser / Mobile"])
    
    subgraph Frontend ["Vercel Edge Network"]
        VercelApp["React 18 / Vite SPA<br/>https://forge-quote-bice.vercel.app"]
    end
    
    subgraph Backend ["Render Cloud"]
        Ingress["Render Ingress Proxy<br/>(SSL Termination & Load Balancer)"]
        ExpressAPI["Node.js / Express API<br/>https://forgequote-7xo3.onrender.com"]
    end
    
    subgraph Storage ["Managed Cloud Services"]
        Supabase["Supabase PostgreSQL<br/>IPv4 Connection Pooler: 5432"]
        GroqAI["Groq Cloud LLM<br/>llama-3.3-70b-versatile"]
    end

    User -->|"HTTPS Request"| VercelApp
    User -->|"Dual-Mode Auth (Bearer Token + Cookie)"| Ingress
    Ingress --> ExpressAPI
    ExpressAPI -->|"pg pool (SSL required)"| Supabase
    ExpressAPI -->|"AI RFQ Extraction & Domain Review"| GroqAI
```

### Active Production Links
- **Frontend URL**: `https://forge-quote-bice.vercel.app`
- **Backend API URL**: `https://forgequote-7xo3.onrender.com`
- **API Health Endpoint**: `https://forgequote-7xo3.onrender.com/api/health`

---

## 🗄️ Step 1: Database Setup (Supabase PostgreSQL)

ForgeQuote requires PostgreSQL 15+ with SSL enabled.

### 1. Provisioning & Connection String
1. Create a project on [Supabase](https://supabase.com).
2. Go to **Project Settings** → **Database**.
3. Under **Connection pooling**, select **Mode: Session** and port **5432**.
4. Use the **IPv4 Pooler URL** (`aws-0-*.pooler.supabase.com:5432`). Render free/starter instances communicate via IPv4; direct Supabase hostnames (`db.xxxx.supabase.co`) only resolve over IPv6.

Example format:
```text
postgresql://postgres.[project-ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
```

> [!IMPORTANT]
> Ensure the database name at the end of the URL is `/postgres`. Do not append extraneous characters (e.g. `/postgresres`), or the connection will return a 500 error.

### 2. Run Database Migrations
Run the 13 schema migrations from your local terminal against the Supabase database:
```bash
# In your local repository root, set DATABASE_URL to your Supabase connection string
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require" npm run migrate
```

### 3. Seed Production Demo Data
Seed the four default departmental roles (Estimator, Plant Head, Sales Head, Administrator) and baseline rate masters:
```bash
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require" DEMO_PASSWORD="ForgeQuote123!" npm run seed
```

---

## 🚀 Step 2: Backend Deployment on Render

### 1. Create a Web Service
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository: `ForgeQuote`.
4. Configure service parameters:
   - **Name**: `forgequote`
   - **Region**: Choose closest to your database (e.g., `Oregon (US West)` or `Frankfurt (EU Central)`).
   - **Branch**: `main`
   - **Root Directory**: Leave blank (monorepo root).
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start --workspace server` (or `node server/src/server.js`)
   - **Instance Type**: `Free` or `Starter`

### 2. Configure Backend Environment Variables
Under the **Environment** tab, add the following variables:

| Key | Value / Recommendation |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `4000` (or leave default, Render sets `PORT` automatically) |
| `DATABASE_URL` | `postgresql://postgres.[project]:[password]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require` |
| `JWT_SECRET` | Strong 64-character secret generated via `openssl rand -hex 32` |
| `CLIENT_ORIGIN` | `https://forge-quote-bice.vercel.app` *(Must match your Vercel URL exactly with no trailing slash)* |
| `COOKIE_SECURE` | `true` |
| `GROQ_API_KEY` | `gsk_...` *(Obtained from console.groq.com)* |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` |
| `COMPANY_NAME` | `ForgeQuote Manufacturing Pvt. Ltd.` |
| `COMPANY_ADDRESS` | `Sector 5, Industrial Area, Kolkata - 700001, India` |
| `QUOTATION_TAX_RATE` | `18` |
| `QUOTATION_VALIDITY_DAYS` | `30` |
| `QUOTATION_HIGH_VALUE_THRESHOLD` | `100000` |
| `PRIVATE_DOCUMENTS_DIR` | `./server/private-documents` |

### 3. Ingress & Proxy Trust (`express-rate-limit`)
Because Render terminates SSL at an edge reverse proxy and forwards requests with `X-Forwarded-For` headers, ForgeQuote includes:
```javascript
// server/src/app.js
app.set('trust proxy', 1);
```
This ensures `express-rate-limit` accurately detects client IPs without crashing with `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`.

---

## ⚡ Step 3: Frontend Deployment on Vercel

### 1. Import Project into Vercel
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New…** → **Project**.
3. Import the `ForgeQuote` GitHub repository.

### 2. Configure Build & Output Settings
- **Framework Preset**: `Vite`
- **Root Directory**: Click *Edit* and select **`client`**.
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Configure Frontend Environment Variables
Add the following under **Environment Variables**:

| Key | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://forgequote-7xo3.onrender.com/api` |

### 4. SPA Client Routing (`client/vercel.json`)
To ensure that client-side routes like `/app/rfqs`, `/app/costing`, and `/login` do not return 404 on page refresh, verify that `client/vercel.json` exists with the rewrite rule:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Deploy the project. Vercel will build and assign the production URL (e.g. `https://forge-quote-bice.vercel.app`).

---

## 🔐 Cross-Origin Authentication: Dual-Mode Auth

### The Problem
When the frontend is deployed at `https://forge-quote-bice.vercel.app` and the API is at `https://forgequote-7xo3.onrender.com`, they reside on different top-level domains. Modern browsers (Google Chrome, Apple Safari, Brave) enforce third-party cookie restrictions:
1. When `/api/auth/login` sets an `HttpOnly; SameSite=None; Secure` cookie, browsers may drop or block the cookie on cross-site fetch calls.
2. Subsequent calls to `/api/dashboard` fail with `401 Unauthorized`.

### The ForgeQuote Solution
ForgeQuote implements **Dual-Mode Resilient Authentication**:
1. **Server Response**: On login, the server sets the `session` cookie AND returns `{ token, user }` in the JSON response body.
2. **Client Storage & Header Injection**: The frontend client (`client/src/lib/api.js`) stores the token in memory/localStorage and attaches `Authorization: Bearer <token>` to all subsequent HTTP requests.
3. **Server Verification**: The auth middleware checks for the token in the `Authorization` header first, falling back to the cookie if the header is absent.

This guarantees flawless authentication regardless of whether third-party cookies are enabled, blocked, or partitioned by the browser.

---

## 🔄 CI/CD Pipeline (GitHub Actions)

Continuous integration is handled by `.github/workflows/ci.yml`.

### Workflow Stages:
1. **Lint & Test**: Runs backend integration tests (74 tests across 14 test suites) using Node.js 20 and an in-memory / containerized database.
2. **Frontend Build Validation**: Compiles the Vite client to catch JSX, syntax, and asset resolution errors.
3. **Docker Buildx Validation**: Uses `docker/setup-buildx-action@v4` to validate the production Dockerfile container build without publishing secrets.

To inspect runs, navigate to the **Actions** tab in the GitHub repository.

---

## 🩺 Post-Deployment Verification Checklist

After deploying both frontend and backend, verify end-to-end functionality:

- [ ] **API Health Check**: Navigate to `https://forgequote-7xo3.onrender.com/api/health`. Expected response: `{"status":"ok","timestamp":"..."}`.
- [ ] **Landing Page**: Open `https://forge-quote-bice.vercel.app/` on mobile and desktop. Verify that the hero section, capabilities cards, workflow progression, and FQ favicon render cleanly.
- [ ] **Estimator Flow**: Log in with `estimator@forgequote.test` / `ForgeQuote123!`.
  - Open an assigned RFQ and click **Open Costing**.
  - Modify machine cycle times, save draft, and submit for Plant Head review.
  - Trigger **AI review assistance** and check advisory recommendations.
- [ ] **Plant Head Flow**: Log in with `plant.head@forgequote.test`.
  - Navigate to **Routing reviews**.
  - Inspect operations, machine rates, cycle times, and click **Approve Route**.
- [ ] **Sales Head Flow**: Log in with `sales.head@forgequote.test`.
  - Navigate to **Commercial reviews**.
  - Inspect margin calculations and click **Approve Quotation**.
- [ ] **Quotation PDF Generation**: Download the approved quotation PDF. Verify that the snapshot PDF includes company details, tax breakdowns, validity dates, and is recorded in the **Audit history**.
