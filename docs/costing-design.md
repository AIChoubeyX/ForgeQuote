# Costing and routing design

## Costing assumptions

- Costing dates are PostgreSQL `DATE` values. A rate applies when
  `effective_from <= costing_date <= effective_to`, with an open-ended
  `effective_to` treated as continuing indefinitely.
- Material cost is gross part weight multiplied by the material price per
  kilogram. Scrap is an additional percentage of material cost; gross weight
  does not include scrap.
- Manufacturing cost is the sum of `cycle_time_minutes / 60 * machine_hour_rate`
  for each operation.
- Overhead is a percentage of material plus manufacturing cost.
- Packing and freight seed values are illustrative per-part assumptions.
- Margin is a percentage of selling price, so selling price is
  `cost / (1 - margin / 100)`. It is not a markup.
- The displayed volume scenarios are half the RFQ volume (minimum one), the
  RFQ volume, and twice the RFQ volume. Costs are currently variable per part;
  no unsupported volume efficiency is assumed.

The backend uses fixed-point six-decimal `BigInt` arithmetic for calculations.
Persisted inputs, rate snapshots, and results are stored in PostgreSQL JSONB and
NUMERIC-backed rate tables. A costing revision captures the exact rate version
and value used, so later rate changes do not rewrite historical calculations.

## Routing states

Costing revisions move through `draft`, `pending_review`, `approved`, and
`changes_requested`. Only the assigned estimator can create and submit drafts.
Only the plant head can make a pending review decision. Decisions require a
comment and optimistic `row_version` matching; submitted revisions are
immutable and a returned route is resubmitted as a new revision.

## Commercial approval and quotations

Plant approval creates one pending `commercial_reviews` record for the approved
costing revision. A sales head may approve or return it only while it is
pending; approval creates an immutable quotation snapshot and a unique
quotation number using a PostgreSQL sequence. Commercial return moves the
costing revision to `changes_requested`, so estimator correction creates a new
revision and requires plant review again.

PDF generation is idempotent through the unique quotation-document relation.
The PDF is generated only for an approved review and is stored as protected
database bytes. `COMPANY_NAME`, `COMPANY_ADDRESS`, `QUOTATION_TAX_RATE`, and
`QUOTATION_VALIDITY_DAYS` must be configured before PDF generation; the service
rejects incomplete configuration instead of inventing company or tax data.
