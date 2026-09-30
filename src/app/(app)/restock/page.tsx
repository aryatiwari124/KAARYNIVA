import { getAllProductForecasts } from "@/lib/forecast";
import { RestockTable } from "@/components/restock/restock-table";
import { InsightCard, type InsightCardProps } from "@/components/insights/insight-card";
import { getRestockInsight } from "@/lib/ai/insights/restock";

export default async function RestockPage() {
  let forecasts: any[] = [];
  let restockInsight: InsightCardProps = {
    headline: "Stock Optimization",
    body: "Inventory forecasting blends sales velocity, trend, and seasonal patterns.",
    citedFigures: [],
    severity: "info",
    source: "deterministic",
  };

  try {
    const [f, insight] = await Promise.all([getAllProductForecasts(), getRestockInsight()]);
    forecasts = f;
    restockInsight = insight;
  } catch (err) {
    console.error("Restock DB query error:", err);
  }
  forecasts.sort((a, b) => {
    const da = a.stockout.daysUntilStockout;
    const db = b.stockout.daysUntilStockout;
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });

  const urgent = forecasts.filter(
    (f) => f.stockout.daysUntilStockout !== null && f.stockout.daysUntilStockout <= 14
  ).length;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Restock queue</h1>
        <p className="text-ink-muted mt-1 text-sm">
          {urgent === 0
            ? "Nothing needs attention in the next two weeks."
            : `${urgent} product${urgent === 1 ? "" : "s"} projected to run low within 14 days.`}{" "}
          Forecasts blend recent sales velocity, weekly patterns, and trend — sorted most urgent first.
        </p>
      </div>
      <InsightCard {...restockInsight} />
      <RestockTable forecasts={forecasts} />
    </div>
  );
}
