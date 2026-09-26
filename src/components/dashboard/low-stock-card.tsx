import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { ProductVelocity } from "@/lib/analytics/velocity";

export function LowStockCard({ products }: { products: ProductVelocity[] }) {
  const low = products.filter((p) => p.belowReorderPoint).slice(0, 5);
  const totalLow = products.filter((p) => p.belowReorderPoint).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs restocking</CardTitle>
        <CardDescription>
          {totalLow === 0 ? "All stock levels look healthy" : `${totalLow} product${totalLow === 1 ? "" : "s"} at or below reorder point`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {low.length === 0 && (
          <p className="text-sm text-ink-muted py-4 text-center">Nothing urgent.</p>
        )}
        {low.map((p) => (
          <div key={p.productId} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0 flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-warning shrink-0" />
              <span className="font-medium text-ink truncate">{p.name}</span>
            </div>
            <span className="text-ink-muted tabular-nums shrink-0">
              {p.stockQty} {p.unit} left
              {p.daysOfCover !== null && ` · ~${Math.max(0, Math.round(p.daysOfCover))}d cover`}
            </span>
          </div>
        ))}
        {totalLow > 0 && (
          <Link href="/restock" className="text-xs text-accent hover:text-accent-hover font-medium inline-block pt-1">
            View restock queue →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
