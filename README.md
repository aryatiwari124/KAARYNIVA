# Arya

A small-business management app for a kirana-style shop: products, customers,
suppliers, sales, purchases, expenses, and a stock ledger that's the source of
truth for every unit of inventory. On top of that: a demand forecasting engine,
a dashboard of computed analytics, and an AI layer that narrates what's
happening in plain language — grounded so it can never invent a number.

## Quick start

```bash
npm install
cp .env.example .env   # or see "Environment variables" below
npx prisma migrate dev
npm run seed            # wipes and reseeds 90 days of demo data
npm run dev
```

Open http://localhost:3010 and sign in with a demo login button, or:

| Role  | Email              | Password      |
| ----- | ------------------ | ------------- |
| Owner | owner@arya.test    | password123   |
| Staff | staff@arya.test    | password123   |

## Local Postgres

This project expects its own Postgres instance rather than sharing one on the
machine's default port. To spin one up with Homebrew's `postgresql@14`:

```bash
initdb -D .pgdata -U postgres -A trust --no-locale -E UTF8
pg_ctl -D .pgdata -l .pgdata/logfile -o "-p 5544" start
createdb -p 5544 -U postgres arya_dev
```

Then set `DATABASE_URL="postgresql://postgres@localhost:5544/arya_dev?schema=public"`
in `.env`. Any Postgres 14+ works — this is just the setup used during
development. `.pgdata/` is gitignored.

## Environment variables

```bash
DATABASE_URL="postgresql://postgres@localhost:5544/arya_dev?schema=public"
AUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3010"

# Optional — the AI layer degrades gracefully without these. Every insight
# has a deterministic, computed fallback, so the app is fully functional
# with these left blank.
ANTHROPIC_API_KEY=""
AI_INSIGHTS_ENABLED="true"
```

## Scripts

| Command          | What it does                                              |
| ---------------- | ----------------------------------------------------------- |
| `npm run dev`    | Start the dev server                                       |
| `npm run build`  | Production build                                           |
| `npm run seed`   | Wipe and reseed 90 days of realistic demo data              |
| `npm test`       | Run the test suite (integration tests hit the real DB)      |
| `npm run lint`   | ESLint                                                      |

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma · PostgreSQL ·
Auth.js v5 (credentials) · Zod · Recharts · `@anthropic-ai/sdk`

## Design decisions worth knowing about

- **Money is integer paise everywhere**, never float rupees or Decimal. See
  `src/lib/money.ts` for the only place conversion happens (at the UI
  boundary). This sidesteps an entire class of rounding bugs.
- **The stock ledger is append-only and is the source of truth.**
  `Product.stockQty` is a denormalized cache, always written in the same
  database transaction as the ledger entry that produced it (`src/lib/
  inventory/stock.ts`). Historical sales/purchases are never edited — voiding
  one writes a compensating `RETURN_SALE`/`RETURN_PURCHASE` entry instead.
- **Concurrent sales can't oversell the same product.** `applyStockMovements`
  takes a `SELECT ... FOR UPDATE` row lock (in a stable sort order, to avoid
  deadlocks) before validating and writing — proven by a test that fires two
  concurrent sales at a product with only enough stock for one
  (`src/lib/inventory/__tests__/stock.test.ts`).
- **The AI layer never does arithmetic.** Every number it's allowed to cite
  must already exist in the JSON payload it was given; a response citing an
  untraceable number is rejected and retried, then falls back to a
  deterministic, template-based narrative computed from the same data. See
  `src/lib/ai/numeric-validator.ts` and the walkthrough in
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#the-ai-layer-grounded-insights).
- **Forecasting is a from-scratch weighted-MA + damped-trend + day-of-week
  model**, not a wrapped library — see
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#forecasting) for the math and
  why it's backtested with MAPE rather than assumed accurate.

## Testing

The test suite (`npm test`, via Vitest) runs against the real project
Postgres instance rather than mocks — the stock ledger's correctness
guarantees are about real row-locking behavior under Postgres's actual
transaction semantics, which a mock can't exercise. Analytics and forecasting
math are covered with hand-calculated fixtures (e.g. a discount allocated
proportionally across sale lines, a damped-trend forecast checked against the
closed-form geometric sum, MAPE computed against a known actual/forecast
pair).

## More detail

[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) covers the data model, the
transactional stock/money paths, the analytics and forecasting engines, and
the AI grounding contract in more depth than fits here.
