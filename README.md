# ForgeQuote

ForgeQuote is a Phase 1 manufacturing RFQ workspace built as a modular monolith: React/Vite client, Express API, and PostgreSQL.

## Run locally

1. Install Node.js 20+ and PostgreSQL 15+.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and a long `JWT_SECRET`. The API accepts either the repository-root `.env` or `server/.env`; `server/.env` takes precedence when both exist.
3. Install dependencies: `npm install`.
4. Create the database named in `DATABASE_URL`, then run `npm run migrate`.
5. Seed synthetic demo data with `npm run seed`. Set `DEMO_PASSWORD` to use a different demo password.
6. Start both applications with `npm run dev`. Or start independently with `npm run dev --workspace client` and `npm run dev --workspace server`. The client runs on `http://localhost:5173`, API on `http://localhost:4000`.

Demo accounts use the emails `estimator@forgequote.test`, `sales.head@forgequote.test`, `plant.head@forgequote.test`, and `admin@forgequote.test`. The default password is `ForgeQuote123!`.

## Structure

`server/src/modules` owns auth, users, customers, dashboard, RFQ, and audit business boundaries. Each implemented module exposes routes, controllers, services, and repositories where applicable. `server/src/shared` contains cross-cutting authentication, authorization, validation, and error handling. PostgreSQL migrations are ordered SQL files recorded in `schema_migrations`, and seed scripts are separate from application startup.

## API and testing

The API uses HttpOnly cookie JWT sessions and credentialed CORS. Set `CLIENT_ORIGIN` and `COOKIE_SECURE=true` when deploying behind HTTPS. Run `npm test` for the API smoke tests. Run `npm run build` to create the production client bundle.

Phase 1 intentionally does not implement AI intake, costing, approvals, quotation PDFs, rate masters, or public signup. Run migrations against the same deployed `DATABASE_URL` before seeding an assessment environment; verify the four accounts with `GET /api/auth/me` after logging in. The local PostgreSQL role/password must match `DATABASE_URL`; no database credential is committed.

## Approval workflow and quotation PDFs

The persisted workflow is:

`RFQ draft/in_progress -> costing pending_review -> plant approved -> commercial pending -> commercial approved -> quotation approved -> quotation issued`

Plant or commercial returns move the costing revision to `changes_requested`; the
estimator must create and resubmit a new revision. Submitted and approved
revisions are immutable. Plant and sales decisions use optimistic row versions
and are written to the audit log.

PDF generation requires deployment configuration in `server/.env`:

```text
COMPANY_NAME=Your configured company name
COMPANY_ADDRESS=Your configured company address
QUOTATION_TAX_RATE=0
QUOTATION_VALIDITY_DAYS=30
```

The service refuses to generate a PDF when these values are missing instead of
inventing company, tax, or commercial terms. Approved PDFs are stored as
protected database documents and repeated downloads reuse the same snapshot.

Quotation approval and issuance are distinct persisted states. The quotation
becomes `issued`, and its RFQ becomes `quoted`, only when an approved quotation
has an associated generated document. Migration `011_reconcile_issued_quotations.sql`
reconciles older documents from that persisted relationship without fabricating
approval or issuance audit events.

Incoming RFQ PDFs and Excel part lists are stored outside the public web root in
`PRIVATE_DOCUMENTS_DIR` (default `server/private-documents`). PostgreSQL stores
their metadata, versions, and replacement relationships; downloads are served
only through authenticated API routes.
