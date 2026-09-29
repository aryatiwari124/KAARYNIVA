"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatPaise, paiseToRupees } from "@/lib/money";
import { useDemoGuard } from "@/components/auth/demo-guard";

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unit: string;
  sellingPricePaise: number;
  stockQty: number;
}

export interface CustomerOption {
  id: string;
  name: string;
}

interface LineItem {
  productId: string;
  quantity: string;
  unitPriceRupees: string;
}

function emptyLine(): LineItem {
  return { productId: "", quantity: "1", unitPriceRupees: "" };
}

export function SaleForm({
  products,
  customers,
  role,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
  role: Role;
}) {
  const router = useRouter();
  const { requireLogin } = useDemoGuard();
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [customerId, setCustomerId] = useState("");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [discountRupees, setDiscountRupees] = useState("0");
  const [amountPaidRupees, setAmountPaidRupees] = useState("");
  const [notes, setNotes] = useState("");
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function handleProductChange(index: number, productId: string) {
    const product = productMap.get(productId);
    updateLine(index, {
      productId,
      unitPriceRupees: product ? String(paiseToRupees(product.sellingPricePaise)) : "",
    });
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  const subtotalRupees = lines.reduce((sum, l) => {
    const qty = Number(l.quantity) || 0;
    const price = Number(l.unitPriceRupees) || 0;
    return sum + qty * price;
  }, 0);
  const discount = Number(discountRupees) || 0;
  const totalRupees = Math.max(subtotalRupees - discount, 0);
  const amountPaid = amountPaidRupees === "" ? totalRupees : Number(amountPaidRupees) || 0;
  const due = totalRupees - amountPaid;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (requireLogin("Recording a sale requires a registered user account.")) return;
    setError(null);

    const items = lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitPriceRupees: Number(l.unitPriceRupees) || 0,
      }));

    if (items.length === 0) {
      setError("Add at least one product line.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customerId || undefined,
        saleDate,
        items,
        discountRupees: discount,
        amountPaidRupees: amountPaid,
        notes: notes || undefined,
        allowNegativeStock,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }

    router.push("/sales");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customer">Customer</Label>
          <Select id="customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Walk-in customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="saleDate">Date</Label>
          <Input
            id="saleDate"
            type="date"
            required
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Items</Label>
        <div className="space-y-2">
          {lines.map((line, i) => {
            const product = productMap.get(line.productId);
            const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPriceRupees) || 0);
            return (
              <div
                key={i}
                className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_5rem_6.5rem_5.5rem_2rem] sm:gap-2 sm:items-start rounded-lg border border-border p-2 bg-surface"
              >
                <Select
                  value={line.productId}
                  onChange={(e) => handleProductChange(i, e.target.value)}
                  required
                >
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — {p.stockQty} {p.unit} in stock
                    </option>
                  ))}
                </Select>
                <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center sm:contents">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Qty"
                    required
                    value={line.quantity}
                    onChange={(e) => updateLine(i, { quantity: e.target.value })}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    required
                    value={line.unitPriceRupees}
                    onChange={(e) => updateLine(i, { unitPriceRupees: e.target.value })}
                  />
                  <div className="h-10 flex items-center justify-end text-sm font-medium text-ink pr-1 whitespace-nowrap">
                    {formatPaise(Math.round(lineTotal * 100), { decimals: false })}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="h-10 flex items-center justify-center text-ink-muted hover:text-danger"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {product && Number(line.quantity) > product.stockQty && !allowNegativeStock && (
                  <p className="sm:col-span-5 text-xs text-warning">
                    Only {product.stockQty} {product.unit} in stock.
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          <Plus className="h-4 w-4" /> Add line
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="discount">Discount (₹)</Label>
          <Input
            id="discount"
            type="number"
            min="0"
            step="0.01"
            value={discountRupees}
            onChange={(e) => setDiscountRupees(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="amountPaid">Amount paid (₹)</Label>
          <Input
            id="amountPaid"
            type="number"
            min="0"
            step="0.01"
            placeholder={totalRupees.toFixed(2)}
            value={amountPaidRupees}
            onChange={(e) => setAmountPaidRupees(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {role === "OWNER" && (
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={allowNegativeStock}
            onChange={(e) => setAllowNegativeStock(e.target.checked)}
          />
          Allow selling below available stock
        </label>
      )}

      <div className="rounded-lg bg-surface-muted p-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-muted">Subtotal</span>
          <span>{formatPaise(Math.round(subtotalRupees * 100))}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">Discount</span>
          <span>−{formatPaise(Math.round(discount * 100))}</span>
        </div>
        <div className="flex justify-between font-semibold text-base pt-1 border-t border-border">
          <span>Total</span>
          <span>{formatPaise(Math.round(totalRupees * 100))}</span>
        </div>
        {due !== 0 && (
          <div className="flex justify-between text-warning">
            <span>{due > 0 ? "Due" : "Change"}</span>
            <span>{formatPaise(Math.round(Math.abs(due) * 100))}</span>
          </div>
        )}
      </div>

      <FieldError>{error ?? undefined}</FieldError>

      <div className="flex justify-end gap-2">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Recording…" : "Record sale"}
        </Button>
      </div>
    </form>
  );
}
