import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
import { TopProductsCard } from "@/components/dashboard/top-products-card";
import { DeadStockCard } from "@/components/dashboard/dead-stock-card";
import { LowStockCard } from "@/components/dashboard/low-stock-card";
import { comparePeriods } from "@/lib/analytics/period-compare";
import { getDailyRevenueSeries } from "@/lib/analytics/daily-series";
import { getTopProducts } from "@/lib/analytics/top-products";
import { getDeadStock } from "@/lib/analytics/dead-stock";
import { getProductVelocity } from "@/lib/analytics/velocity";
import { previousPeriod } from "@/lib/analytics/types";
import { formatPaise, formatPercent } from "@/lib/money";
import { InsightCard } from "@/components/insights/insight-card";
import { getBriefingInsight } from "@/lib/ai/insights/briefing";
import { getProfitDropInsight } from "@/lib/ai/insights/profit-drop";
import { getDeadStockInsight } from "@/lib/ai/insights/dead-stock";

export default async function DashboardPage() {
  const session = await auth();
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  const range = { from, to };
  const previous = previousPeriod(range);

  const [comparison, series, topProducts, deadStock, velocity, briefing, profitDropInsight, deadStockInsight] =
    await Promise.all([
      comparePeriods(range, previous),
      getDailyRevenueSeries(range),
      getTopProducts(range, { by: "revenue", limit: 6 }),
      getDeadStock(30),
      getProductVelocity(range),
      getBriefingInsight(),
      getProfitDropInsight(),
      getDeadStockInsight(),
    ]);

  const { current, previous: prevSummary } = comparison;

  const netProfitDeltaPct =
    prevSummary.netProfitPaise !== 0
      ? (current.netProfitPaise - prevSummary.netProfitPaise) / Math.abs(prevSummary.netProfitPaise)
      : null;
  const orderDeltaPct =
    prevSummary.orderCount > 0
      ? (current.orderCount - prevSummary.orderCount) / prevSummary.orderCount
      : null;

  const firstName = session!.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Good to see you, {firstName}.</h1>
        <p className="text-ink-muted mt-1">Last 30 days, compared to the 30 days before that.</p>
      </div>

      <InsightCard {...briefing} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Revenue"
          value={formatPaise(current.revenuePaise)}
          deltaPct={comparison.revenueDeltaPct}
        />
        <StatTile
          label="Gross profit"
          value={formatPaise(current.grossProfitPaise)}
          sublabel={current.grossMarginPct !== null ? `${formatPercent(current.grossMarginPct)} margin` : undefined}
          deltaPct={comparison.profitDeltaPct}
        />
        <StatTile
          label="Net profit"
          value={formatPaise(current.netProfitPaise)}
          sublabel={current.netMarginPct !== null ? `${formatPercent(current.netMarginPct)} margin` : undefined}
          deltaPct={netProfitDeltaPct}
        />
        <StatTile
          label="Orders"
          value={String(current.orderCount)}
          sublabel={current.avgOrderValuePaise ? `avg ${formatPaise(current.avgOrderValuePaise)}` : undefined}
          deltaPct={orderDeltaPct}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue &amp; profit</CardTitle>
          <CardDescription>Daily, last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueTrendChart data={series} />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <TopProductsCard products={topProducts} />
        <div className="space-y-4">
          <DeadStockCard items={deadStock} />
          {deadStock.length > 0 && <InsightCard {...deadStockInsight} />}
          <LowStockCard products={velocity} />
        </div>
      </div>

      {(comparison.topContributors.length > 0 || comparison.topDetractors.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>What moved</CardTitle>
            <CardDescription>Biggest revenue swings vs. the previous period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <InsightCard {...profitDropInsight} />
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">Grew</p>
              <ul className="space-y-1.5 text-sm">
                {comparison.topContributors.length === 0 && <li className="text-ink-muted">None</li>}
                {comparison.topContributors.map((d) => (
                  <li key={d.productId} className="flex justify-between gap-3">
                    <span className="text-ink truncate">{d.name}</span>
                    <span className="text-success tabular-nums shrink-0">
                      +{formatPaise(d.deltaPaise)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">Declined</p>
              <ul className="space-y-1.5 text-sm">
                {comparison.topDetractors.length === 0 && <li className="text-ink-muted">None</li>}
                {comparison.topDetractors.map((d) => (
                  <li key={d.productId} className="flex justify-between gap-3">
                    <span className="text-ink truncate">{d.name}</span>
                    <span className="text-danger tabular-nums shrink-0">{formatPaise(d.deltaPaise)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
