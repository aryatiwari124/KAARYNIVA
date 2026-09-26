# Architecture

## Data model

Masters: `Product`, `Customer`, `Supplier` — soft-deleted via `isActive`,
never hard-deleted (a `Sale`/`Purchase` line references a product forever,
even after it's discontinued).

Transactions: `Sale` → `SaleItem`, `Purchase` → `PurchaseItem`. Every line
item snapshots the money at the moment of the transaction —
`SaleItem.unitCostPaise` is the product's cost *at sale time*, never
recomputed later even if the product's cost changes afterward. This is what
makes historical gross-profit figures stable: a cost correction today doesn't
silently rewrite last month's numbers.

`StockLedgerEntry` is append-only and is the actual source of truth for
inventory. `Product.stockQty` is a denormalized cache of "sum of ledger
entries for this product," kept in sync by writing both in the same
transaction — never independently. `Expense` is a flat category/amount/date
record. `Counter` gives sales atomic sequential invoice numbers
(`INV-00001`, ...) without a race between concurrent creates. `InsightCache`
stores validated AI responses keyed by a hash of their input payload.

All money fields are `Int` columns storing paise (1 rupee = 100 paise) — see
`src/lib/money.ts`. There is no `Decimal` or `Float` money field anywhere in
the schema; conversion to/from rupees happens only at the UI boundary.

## Transactional stock & money (`src/lib/inventory`, `src/lib/transactions`)

`applyStockMovements(tx, movements)` is the one function allowed to touch
`Product.stockQty`. Given a batch of `{productId, quantityDelta}` moves, it:

1. Locks every distinct product row with `SELECT ... FOR UPDATE`, in a
   **stable sorted order** — this is what prevents deadlocks when two
   concurrent transactions touch overlapping sets of products in different
   orders.
2. Applies each movement in array order (so two lines of the same SKU in one
   sale deplete sequentially against a running balance, not a single stale
   read).
3. Rejects the whole batch if any movement would take a product negative,
   unless the caller explicitly opts into `allowNegative` — the row lock held
   for the transaction's duration is what makes this check race-free under
   concurrency (proven in
   `src/lib/inventory/__tests__/stock.test.ts` and the concurrent-oversell
   test in `src/lib/transactions/__tests__/sales.test.ts`, which fires two
   simultaneous sales against a product with only enough stock for one and
   asserts exactly one succeeds).
4. Writes one `StockLedgerEntry` per movement, then updates
   `Product.stockQty` to the final balance — both inside the same DB
   transaction as the Sale/Purchase header they belong to.

`recordSale` / `recordPurchase` (in `src/lib/transactions/`) are the only
entry points that create a `Sale` or `Purchase` — the seed script uses them
too, so seeded data goes through the exact same validation and ledger-writing
path as data created through the UI. Historical records are never edited:
`voidSale` / `voidPurchase` write compensating `RETURN_SALE` /
`RETURN_PURCHASE` ledger entries rather than mutating or deleting anything.
Voiding a purchase is blocked (via the same negative-stock check) if the
stock it added has already been sold onward.

## Analytics (`src/lib/analytics`)

Revenue, COGS, gross/net profit and margins for a date range
(`revenue.ts`); per-product velocity and days-of-cover (`velocity.ts`);
dead-stock detection by days-since-last-sale (`dead-stock.ts`); customer
recency/frequency (`customers.ts`); top products by revenue/profit/quantity
(`top-products.ts`); and period-over-period comparison with per-product
attribution of what grew or declined (`period-compare.ts`).

The one non-obvious correctness detail: `Sale.discountPaise` lives at the
**header** level, not per line. Summing `SaleItem.lineTotalPaise` directly to
attribute revenue to a product would overstate it whenever a sale carries a
discount. `queries.ts`'s `getAllocatedSaleItems` allocates each sale's
discount across its lines proportionally to line size before any per-product
aggregation, so top-products and period-comparison figures always foot back
to the sale's true (post-discount) total — see the discount-allocation test
in `src/lib/analytics/__tests__/top-products.test.ts`.

## Forecasting (`src/lib/forecast`)

A from-scratch demand model, not a wrapped time-series library — chosen so
every step is a small, independently testable pure function rather than a
black box.

1. **Daily-week seasonality**: `computeDowFactors` derives a multiplicative
   factor per weekday (Sunday–Saturday) from 8 weeks of history — a
   weekday's historical average divided by the overall average. A product
   with a real weekend spike gets a >1 Saturday/Sunday factor.
2. **Deseasonalize**: divide each day's actual demand by its weekday's
   factor, producing a series with the weekly pattern removed.
3. **Level**: a recency-weighted moving average (older=weight 1, newest=weight
   N) over the trailing 14 deseasonalized days.
4. **Trend**: the average day-over-day change between the older and newer
   halves of a 28-day deseasonalized window.
5. **Forecast**: `level + trend × dampedSum(h)`, where `dampedSum(h) = φ + φ² +
   ... + φʰ` (Holt's damped-trend formula, φ=0.85) — this is what stops a
   10-day-out forecast from being a naive linear extrapolation that runs
   away. The result is then re-seasonalized by multiplying back the target
   day's weekday factor.

**Stockout projection** (`stockout.ts`) walks the forecast day-by-day against
current stock to find the first day it would hit zero.
**Reorder sizing** (`reorder.ts`) uses the standard (Q,R) inventory formula:
reorder point = lead-time demand + safety stock, where safety stock = z ×
demand-stddev × √(lead time) — the textbook way to size a buffer against
demand variability during replenishment lead time.

**Backtesting** (`backtest.ts`) is a fixed-origin holdout: fit the model on
everything before the trailing 14 days, forecast that window, and compute
MAPE against what actually happened. The restock queue UI shows this MAPE as
an honest confidence signal — daily per-SKU retail demand is genuinely noisy,
so several seeded products correctly show as "volatile" rather than the UI
pretending a precision the underlying data doesn't support.

## The AI layer: grounded insights (`src/lib/ai`)

The core design constraint: **the model is never trusted with arithmetic.**
Every insight feature (briefing, restock, profit-drop, dead-stock, customer,
what-if) follows the same shape:

1. A payload builder calls the existing analytics/forecast functions and
   assembles a small JSON object of pre-computed numbers — revenue deltas,
   product names, dates, MAPE, whatever's relevant.
2. `generateGroundedInsight` (`generate.ts`) checks `InsightCache` first
   (keyed by a hash of the payload), then — if AI is configured and
   enabled — calls Claude with `messages.parse()` and a Zod-defined
   structured-output schema (`schemas.ts`) via `output_config.format`. The
   system prompt (`prompt.ts`) states the no-arithmetic rule explicitly and
   requires every number mentioned in the narrative to also appear in a
   `citedFigures` array.
3. `numeric-validator.ts` recursively extracts every numeric leaf from the
   original payload into a set, then checks that every `citedFigures[].value`
   the model returned is within a small rounding tolerance of some number in
   that set. **Any citation that doesn't trace back to the payload fails the
   whole response** — there's no partial trust, no "strip the bad number and
   keep the rest." A failed response is retried once, then falls back to a
   deterministic, template-built narrative computed directly from the
   payload with plain string interpolation — no model call at all.
4. Only validated AI responses are cached; deterministic fallbacks are cheap
   enough to recompute every time and aren't worth caching.

This means the app is **fully functional with `ANTHROPIC_API_KEY` unset** —
every insight still renders a computed, accurate summary, just without the
narrative polish. The "Why?" disclosure on every `InsightCard` shows exactly
which figures backed the claim and whether it came from AI or a computed
fallback, so the trust boundary is visible to the end user, not just enforced
server-side.

`what-if` is slightly different: the price-change simulation itself
(`simulatePriceChange` in `insights/what-if.ts`) is a deterministic
calculator — current 30-day velocity × price delta — and the AI layer is
only ever asked to narrate its output, never to run the "what if" itself.

## Auth & permissions

Credentials-based auth (Auth.js v5, JWT sessions, `src/auth.ts`) with two
roles, `OWNER` and `STAFF`. Route protection happens at two layers:

- `src/proxy.ts` (Next 16's successor to `middleware.ts`) redirects
  unauthenticated page requests to `/login`. API routes are excluded — they
  handle their own auth via `requireSession()` and return JSON 401s.
- `requireSession(minRole?)` (`src/lib/auth/require-session.ts`) is called at
  the top of every API route. Passing `"OWNER"` throws a 403 for
  non-owners.

The permission split, applied consistently across every masters/transaction
route: **any authenticated user can read, create, and edit** — including
recording sales and purchases. **Only an owner can deactivate a master
record, void a sale or purchase, delete an expense, or manage team
accounts.** The `/settings` page additionally redirects non-owners
server-side (not just hiding the nav link), since a hidden link is not a
security boundary — see `src/app/(app)/settings/page.tsx`.
