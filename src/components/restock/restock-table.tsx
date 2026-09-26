import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import type { ProductForecast } from "@/lib/forecast";

function urgencyBadge(daysUntilStockout: number | null) {
  if (daysUntilStockout === null) return <Badge tone="success">Healthy</Badge>;
  if (daysUntilStockout <= 0) return <Badge tone="danger">Out of stock</Badge>;
  if (daysUntilStockout <= 7) return <Badge tone="danger">Critical · {daysUntilStockout}d</Badge>;
  if (daysUntilStockout <= 14) return <Badge tone="warning">Low · {daysUntilStockout}d</Badge>;
  return <Badge tone="success">Healthy · {daysUntilStockout}d</Badge>;
}

function confidenceLabel(mape: number | null, n: number) {
  if (mape === null || n < 5) return <span className="text-ink-muted text-xs">Not enough history</span>;
  if (mape <= 0.3) return <span className="text-success text-xs">Good fit ({Math.round(mape * 100)}% MAPE)</span>;
  if (mape <= 0.6) return <span className="text-warning text-xs">Fair fit ({Math.round(mape * 100)}% MAPE)</span>;
  return <span className="text-danger text-xs">Volatile ({Math.round(mape * 100)}% MAPE)</span>;
}

export function RestockTable({ forecasts }: { forecasts: ProductForecast[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Stock</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Suggested order</TableHeaderCell>
            <TableHeaderCell>Forecast confidence</TableHeaderCell>
            <TableHeaderCell></TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {forecasts.map((f) => (
            <TableRow key={f.productId}>
              <TableCell className="font-medium">{f.name}</TableCell>
              <TableCell className="text-ink-muted">
                {f.stockQty} {f.unit}
              </TableCell>
              <TableCell>{urgencyBadge(f.stockout.daysUntilStockout)}</TableCell>
              <TableCell>
                {f.reorder.suggestedOrderQtyUnits > 0 ? (
                  <span className="font-medium text-ink">
                    {f.reorder.suggestedOrderQtyUnits} {f.unit}
                  </span>
                ) : (
                  <span className="text-ink-muted">—</span>
                )}
              </TableCell>
              <TableCell>{confidenceLabel(f.backtest.mape, f.backtest.n)}</TableCell>
              <TableCell>
                {f.reorder.suggestedOrderQtyUnits > 0 && (
                  <Link href="/purchases/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Order
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
          {forecasts.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-ink-muted py-8">
                No active products yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
