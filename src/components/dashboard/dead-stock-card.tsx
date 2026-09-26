import { PackageX } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPaise } from "@/lib/money";
import type { DeadStockItem } from "@/lib/analytics/dead-stock";

export function DeadStockCard({ items }: { items: DeadStockItem[] }) {
  const top = items.slice(0, 5);
  const totalTiedUp = items.reduce((sum, i) => sum + i.tiedUpCapitalPaise, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dead stock</CardTitle>
        <CardDescription>
          {items.length === 0
            ? "Nothing idle right now"
            : `${formatPaise(totalTiedUp)} tied up across ${items.length} product${items.length === 1 ? "" : "s"}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {top.length === 0 && (
          <p className="text-sm text-ink-muted py-4 text-center flex flex-col items-center gap-2">
            <PackageX className="h-5 w-5" />
            Everything is moving.
          </p>
        )}
        {top.map((item) => (
          <div key={item.productId} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-ink truncate">{item.name}</p>
              <p className="text-xs text-ink-muted">
                {item.stockQty} {item.unit} ·{" "}
                {item.daysSinceLastSale === null ? "never sold" : `idle ${item.daysSinceLastSale}d`}
              </p>
            </div>
            <Badge tone="warning" className="shrink-0">
              {formatPaise(item.tiedUpCapitalPaise)}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
