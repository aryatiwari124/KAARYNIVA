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

export interface PurchaseRow {
  id: string;
  billNo: string | null;
  purchaseDate: string;
  supplier: { id: string; name: string } | null;
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

export function PurchasesClient({
  initialPurchases,
  role,
}: {
  initialPurchases: PurchaseRow[];
  role: Role;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleVoid(id: string) {
    const reason = prompt("Reason for voiding this purchase (optional):") ?? undefined;
    if (reason === undefined) return; // cancelled
    const res = await fetch(`/api/purchases/${id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || undefined }),
    });
    if (res.ok) {
      startTransition(() => router.refresh());
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not void purchase.");
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Purchases</h1>
          <p className="text-ink-muted mt-1 text-sm">{initialPurchases.length} recent purchases</p>
        </div>
        <Link href="/purchases/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" /> New purchase
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Bill No</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Supplier</TableHeaderCell>
              <TableHeaderCell>Items</TableHeaderCell>
              <TableHeaderCell>Total</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {initialPurchases.map((p) => (
              <TableRow key={p.id} className={p.voidedAt ? "opacity-50" : undefined}>
                <TableCell className="font-mono text-xs">{p.billNo || "—"}</TableCell>
                <TableCell className="text-ink-muted">
                  {new Date(p.purchaseDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell>{p.supplier?.name ?? "No supplier"}</TableCell>
                <TableCell className="text-ink-muted">{p.items.length}</TableCell>
                <TableCell className="font-medium">{formatPaise(p.totalPaise)}</TableCell>
                <TableCell>
                  {p.voidedAt ? (
                    <Badge tone="neutral">Voided</Badge>
                  ) : (
                    <Badge tone={paymentTone[p.paymentStatus]}>{p.paymentStatus}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {role === "OWNER" && !p.voidedAt && (
                    <button
                      onClick={() => handleVoid(p.id)}
                      className="p-1.5 rounded-md text-ink-muted hover:bg-danger-soft hover:text-danger"
                      aria-label="Void purchase"
                      title="Void purchase"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {initialPurchases.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-ink-muted py-8">
                  No purchases recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
