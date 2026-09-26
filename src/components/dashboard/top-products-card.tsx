import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatPaise } from "@/lib/money";
import type { TopProduct } from "@/lib/analytics/top-products";

export function TopProductsCard({ products }: { products: TopProduct[] }) {
  const maxRevenue = Math.max(1, ...products.map((p) => p.revenuePaise));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top products</CardTitle>
        <CardDescription>By revenue, this period</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {products.length === 0 && (
          <p className="text-sm text-ink-muted py-4 text-center">No sales in this period yet.</p>
        )}
        {products.map((p) => (
          <div key={p.productId} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-ink truncate">{p.name}</span>
              <span className="text-ink-muted tabular-nums shrink-0">{formatPaise(p.revenuePaise)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(p.revenuePaise / maxRevenue) * 100}%`,
                  background: "var(--chart-revenue)",
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
