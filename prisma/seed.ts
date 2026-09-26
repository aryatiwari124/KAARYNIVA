/**
 * Seeds a demo kirana (general store) with 90 days of realistic history by
 * driving it through the real recordSale/recordPurchase transaction paths —
 * the same code the app uses — so the ledger, cost snapshots and payment
 * statuses are all internally consistent, not hand-faked.
 *
 * Deliberately encodes a few signals for later analytics/forecasting work:
 *  - Wheat Atta: a "hero" product trending up ~2x over the window
 *  - Coffee Powder: a product trending down (losing ~60% of demand)
 *  - Soft Drink / Chips: weekend demand spikes
 *  - Toilet Cleaner: goes dead after day 30 (no sales, no restock) — a
 *    from-day-30-to-90-flat product for dead-stock detection
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { recordSale } from "../src/lib/transactions/sales";
import { recordPurchase } from "../src/lib/transactions/purchases";

const DAYS = 90;
const TODAY = new Date("2026-09-19T12:00:00.000Z");

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function startOfWindow() {
  return addDays(TODAY, -(DAYS - 1));
}

// Deterministic PRNG (mulberry32) so the demo dataset is reproducible.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260919);
const rand = () => rng();
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function weightedPick<T>(items: { item: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const { item, weight } of items) {
    r -= weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1].item;
}

type Trend = "flat" | "up" | "down";

interface ProductDef {
  sku: string;
  name: string;
  category: string;
  unit: string;
  costRupees: number;
  priceRupees: number;
  baseDailyDemand: number;
  trend: Trend;
  weekendBoost?: boolean;
  deadAfterDay?: number; // stops selling/restocking after this day offset
}

const PRODUCTS: ProductDef[] = [
  { sku: "GRC-RICE-5KG", name: "Basmati Rice 5kg", category: "Groceries", unit: "bag", costRupees: 380, priceRupees: 480, baseDailyDemand: 2.0, trend: "flat" },
  { sku: "GRC-DAL-1KG", name: "Toor Dal 1kg", category: "Groceries", unit: "pc", costRupees: 110, priceRupees: 145, baseDailyDemand: 3.0, trend: "flat" },
  { sku: "GRC-OIL-1L", name: "Sunflower Oil 1L", category: "Groceries", unit: "bottle", costRupees: 140, priceRupees: 175, baseDailyDemand: 2.2, trend: "flat" },
  { sku: "GRC-SUGAR-1KG", name: "Sugar 1kg", category: "Groceries", unit: "kg", costRupees: 40, priceRupees: 52, baseDailyDemand: 2.5, trend: "flat" },
  { sku: "GRC-ATTA-5KG", name: "Wheat Atta 5kg", category: "Groceries", unit: "bag", costRupees: 210, priceRupees: 260, baseDailyDemand: 1.8, trend: "up" },
  { sku: "BEV-TEA-250G", name: "Tea Powder 250g", category: "Beverages", unit: "pack", costRupees: 90, priceRupees: 120, baseDailyDemand: 4.0, trend: "flat" },
  { sku: "BEV-COFFEE-200G", name: "Coffee Powder 200g", category: "Beverages", unit: "pack", costRupees: 150, priceRupees: 195, baseDailyDemand: 2.0, trend: "down" },
  { sku: "BEV-SOFTDRINK-750ML", name: "Soft Drink 750ml", category: "Beverages", unit: "bottle", costRupees: 35, priceRupees: 50, baseDailyDemand: 3.5, trend: "flat", weekendBoost: true },
  { sku: "BEV-WATER-1L", name: "Mineral Water 1L", category: "Beverages", unit: "bottle", costRupees: 12, priceRupees: 20, baseDailyDemand: 5.0, trend: "flat" },
  { sku: "SNK-CHIPS-100G", name: "Potato Chips 100g", category: "Snacks", unit: "pack", costRupees: 18, priceRupees: 25, baseDailyDemand: 6.0, trend: "flat", weekendBoost: true },
  { sku: "SNK-NAMKEEN-200G", name: "Namkeen Mix 200g", category: "Snacks", unit: "pack", costRupees: 45, priceRupees: 60, baseDailyDemand: 3.0, trend: "flat" },
  { sku: "SNK-BISCUIT", name: "Biscuits Pack", category: "Snacks", unit: "pack", costRupees: 25, priceRupees: 35, baseDailyDemand: 5.0, trend: "flat" },
  { sku: "HH-DETERGENT-1KG", name: "Detergent Powder 1kg", category: "Household", unit: "pack", costRupees: 85, priceRupees: 110, baseDailyDemand: 2.0, trend: "flat" },
  { sku: "HH-DISHSOAP-500ML", name: "Dish Soap 500ml", category: "Household", unit: "bottle", costRupees: 55, priceRupees: 75, baseDailyDemand: 2.0, trend: "flat" },
  { sku: "HH-TOILETCLEAN-500ML", name: "Toilet Cleaner 500ml", category: "Household", unit: "bottle", costRupees: 60, priceRupees: 85, baseDailyDemand: 1.5, trend: "flat", deadAfterDay: 30 },
  { sku: "PC-TOOTHPASTE-150G", name: "Toothpaste 150g", category: "Personal Care", unit: "pack", costRupees: 60, priceRupees: 82, baseDailyDemand: 3.0, trend: "flat" },
  { sku: "PC-SOAP", name: "Soap Bar", category: "Personal Care", unit: "pc", costRupees: 22, priceRupees: 32, baseDailyDemand: 4.5, trend: "flat" },
  { sku: "PC-SHAMPOO-200ML", name: "Shampoo 200ml", category: "Personal Care", unit: "bottle", costRupees: 95, priceRupees: 130, baseDailyDemand: 1.5, trend: "flat" },
  { sku: "STA-NOTEBOOK", name: "Notebook 200pg", category: "Stationery", unit: "pc", costRupees: 35, priceRupees: 50, baseDailyDemand: 1.0, trend: "flat" },
  { sku: "STA-PENPACK", name: "Pen Pack (10pc)", category: "Stationery", unit: "pack", costRupees: 40, priceRupees: 60, baseDailyDemand: 1.0, trend: "flat" },
];

const CUSTOMERS = [
  { name: "Priya Sharma", phone: "9820011122" },
  { name: "Rahul Verma", phone: "9820011123" },
  { name: "Anjali Nair", phone: "9820011124" },
  { name: "Vikram Singh", phone: "9820011125" },
  { name: "Sunita Iyer", phone: "9820011126" },
  { name: "Arjun Mehta", phone: "9820011127" },
  { name: "Kavita Joshi", phone: "9820011128" },
  { name: "Manoj Pillai", phone: "9820011129" },
  { name: "Deepa Reddy", phone: "9820011130" },
  { name: "Sanjay Gupta", phone: "9820011131" },
  { name: "Neha Kulkarni", phone: "9820011132" },
  { name: "Ramesh Patil", phone: "9820011133" },
];

const SUPPLIERS = [
  { name: "Shree Ganesh Wholesale Traders", phone: "9822233344" },
  { name: "Konkan Distributors", phone: "9822233345" },
  { name: "Metro Foods & Beverages Supply", phone: "9822233346" },
  { name: "Sunrise Household Essentials", phone: "9822233347" },
  { name: "Everyday Care Distributors", phone: "9822233348" },
];

function trendFactor(trend: Trend, progress: number): number {
  if (trend === "up") return 0.4 + 1.6 * progress; // ~0.4x -> ~2.0x
  if (trend === "down") return 1.3 - 0.9 * progress; // ~1.3x -> ~0.4x
  return 1;
}

async function main() {
  console.log("Wiping existing transactional + master data...");
  await prisma.sale.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.stockLedgerEntry.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.counter.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.supplier.deleteMany({});

  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "owner@arya.test" },
    update: {},
    create: { name: "Asha Rao", email: "owner@arya.test", passwordHash, role: "OWNER" },
  });
  await prisma.user.upsert({
    where: { email: "staff@arya.test" },
    update: {},
    create: { name: "Ravi Kumar", email: "staff@arya.test", passwordHash, role: "STAFF" },
  });

  console.log("Creating products, customers, suppliers...");
  const products = await Promise.all(
    PRODUCTS.map((p) =>
      prisma.product.create({
        data: {
          sku: p.sku,
          name: p.name,
          category: p.category,
          unit: p.unit,
          costPricePaise: Math.round(p.costRupees * 100),
          sellingPricePaise: Math.round(p.priceRupees * 100),
          reorderPoint: Math.max(5, Math.ceil(p.baseDailyDemand * 7)),
          stockQty: 0,
        },
      })
    )
  );
  const productByKey = new Map(products.map((p) => [p.sku, p]));

  const customers = await Promise.all(
    CUSTOMERS.map((c) => prisma.customer.create({ data: c }))
  );

  const suppliers = await Promise.all(
    SUPPLIERS.map((s) => prisma.supplier.create({ data: s }))
  );

  const start = startOfWindow();

  // Opening stock: every product gets ~25 days of demand as initial inventory.
  console.log("Recording opening stock purchases...");
  for (const def of PRODUCTS) {
    const product = productByKey.get(def.sku)!;
    const openingQty = Math.max(10, Math.round(def.baseDailyDemand * 25));
    await recordPurchase({
      billNo: `OPEN-${def.sku}`,
      supplierId: pick(suppliers).id,
      purchaseDate: start,
      items: [{ productId: product.id, quantity: openingQty, unitCostPaise: Math.round(def.costRupees * 100) }],
    });
  }

  console.log(`Simulating ${DAYS} days of trading...`);
  let saleCount = 0;
  let purchaseCount = 0;
  let expenseCount = 0;

  for (let dayOffset = 0; dayOffset < DAYS; dayOffset++) {
    const date = addDays(start, dayOffset);
    const dow = date.getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    const progress = dayOffset / (DAYS - 1);

    const activeDefs = PRODUCTS.filter(
      (p) => p.deadAfterDay === undefined || dayOffset <= p.deadAfterDay
    );

    // Restock any active product running low (below ~10 days of demand).
    for (const def of activeDefs) {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: productByKey.get(def.sku)!.id },
      });
      const targetDays = 15;
      const threshold = Math.max(5, Math.round(def.baseDailyDemand * 8));
      if (product.stockQty < threshold) {
        const qty = Math.max(10, Math.round(def.baseDailyDemand * targetDays));
        const costVariance = 1 + (rand() - 0.5) * 0.06; // +/-3%
        await recordPurchase({
          supplierId: pick(suppliers).id,
          purchaseDate: date,
          items: [
            {
              productId: product.id,
              quantity: qty,
              unitCostPaise: Math.round(def.costRupees * 100 * costVariance),
            },
          ],
        });
        purchaseCount++;
      }
    }

    // Basket-based sales for the day.
    const weighted = activeDefs.map((def) => {
      const boost = def.weekendBoost && isWeekend ? 1.8 : 1;
      return { item: def, weight: def.baseDailyDemand * trendFactor(def.trend, progress) * boost };
    });

    const basketCount = isWeekend ? randInt(9, 16) : randInt(5, 11);
    for (let b = 0; b < basketCount; b++) {
      const itemsInBasket = randInt(1, 4);
      const chosenSkus = new Set<string>();
      for (let i = 0; i < itemsInBasket; i++) {
        chosenSkus.add(weightedPick(weighted).sku);
      }

      const saleItems: { productId: string; quantity: number; unitPricePaise: number }[] = [];
      for (const sku of chosenSkus) {
        const def = PRODUCTS.find((p) => p.sku === sku)!;
        const product = await prisma.product.findUniqueOrThrow({
          where: { id: productByKey.get(sku)!.id },
        });
        const qty = randInt(1, 3);
        if (product.stockQty >= qty) {
          saleItems.push({
            productId: product.id,
            quantity: qty,
            unitPricePaise: Math.round(def.priceRupees * 100),
          });
        }
      }
      if (saleItems.length === 0) continue;

      const withCustomer = rand() < 0.7;
      const paymentRoll = rand();
      const subtotal = saleItems.reduce((s, i) => s + i.quantity * i.unitPricePaise, 0);
      const amountPaidPaise =
        paymentRoll < 0.85 ? subtotal : paymentRoll < 0.96 ? Math.round(subtotal * 0.5) : 0;

      // Sale timestamps spread across business hours (9am-9pm IST ~ 3:30-15:30 UTC).
      const saleDate = new Date(date);
      saleDate.setUTCHours(3 + Math.floor(rand() * 12), randInt(0, 59), 0, 0);

      try {
        await recordSale({
          customerId: withCustomer ? pick(customers).id : undefined,
          saleDate,
          items: saleItems,
          amountPaidPaise,
        });
        saleCount++;
      } catch {
        // Rare race between the stock check above and sale time; skip this basket.
      }
    }

    // Recurring + incidental expenses.
    if (date.getUTCDate() === 1 || dayOffset === 0) {
      await prisma.expense.create({
        data: { category: "Rent", amountPaise: 1800000, date, note: "Monthly shop rent" },
      });
      await prisma.expense.create({
        data: { category: "Salaries", amountPaise: 2200000, date, note: "Staff salary" },
      });
      await prisma.expense.create({
        data: {
          category: "Utilities",
          amountPaise: Math.round((3200 + randInt(-400, 600)) * 100),
          date,
          note: "Electricity bill",
        },
      });
      expenseCount += 3;
    }
    if (rand() < 0.35) {
      const category = pick(["Transport", "Packaging", "Maintenance", "Miscellaneous"]);
      await prisma.expense.create({
        data: {
          category,
          amountPaise: Math.round(randInt(100, 600) * 100),
          date,
        },
      });
      expenseCount++;
    }
  }

  console.log(
    `Done. ${products.length} products, ${customers.length} customers, ${suppliers.length} suppliers, ` +
      `${purchaseCount + PRODUCTS.length} purchases, ${saleCount} sales, ${expenseCount} expenses.`
  );
  console.log("Login: owner@arya.test / staff@arya.test — password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
