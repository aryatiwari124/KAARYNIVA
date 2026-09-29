"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Plus, Undo2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/table";
import { formatPaise } from "@/lib/money";
import { useDemoGuard } from "@/components/auth/demo-guard";

export interface SaleRow {
  id: string;
  invoiceNo: string;
  saleDate: string;
  customer: { id: string; name: string } | null;
  items: { id: string }[];
  totalPaise: number;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  voidedAt: string | null;
}

const paymentTone = {
  PAID: "success",
  PARTIAL: "warning",
  UNPAID: "danger",
} as const;

export function SalesClient({ initialSales, role }: { initialSales: SaleRow[]; role: Role }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { requireLogin } = useDemoGuard();

  async function handleVoid(id: string) {
    if (requireLogin("Voiding a sale requires a registered user account.")) return;
    const reason = prompt("Reason for voiding this sale (optional):") ?? undefined;
    if (reason === undefined) return; // cancelled
    const res = await fetch(`/api/sales/${id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || undefined }),
    });
    if (res.ok) {
      startTransition(() => router.refresh());
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not void sale.");
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Sales</h1>
          <p className="text-ink-muted mt-1 text-sm">{initialSales.length} recent invoices</p>
        </div>
        <Link href="/sales/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" /> New sale
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Invoice</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Items</TableHeaderCell>
              <TableHeaderCell>Total</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {initialSales.map((s) => (
              <TableRow key={s.id} className={s.voidedAt ? "opacity-50" : undefined}>
                <TableCell className="font-mono text-xs">{s.invoiceNo}</TableCell>
                <TableCell className="text-ink-muted">
                  {new Date(s.saleDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell>{s.customer?.name ?? "Walk-in"}</TableCell>
                <TableCell className="text-ink-muted">{s.items.length}</TableCell>
                <TableCell className="font-medium">{formatPaise(s.totalPaise)}</TableCell>
                <TableCell>
                  {s.voidedAt ? (
                    <Badge tone="neutral">Voided</Badge>
                  ) : (
                    <Badge tone={paymentTone[s.paymentStatus]}>{s.paymentStatus}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {role === "OWNER" && !s.voidedAt && (
                    <button
                      onClick={() => handleVoid(s.id)}
                      className="p-1.5 rounded-md text-ink-muted hover:bg-danger-soft hover:text-danger"
                      aria-label="Void sale"
                      title="Void sale"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {initialSales.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-ink-muted py-8">
                  No sales recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
