"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Plus, Pencil, Ban, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/table";
import { formatPaise, paiseToRupees } from "@/lib/money";
import { ProductForm, emptyProductForm, type ProductFormValues } from "./product-form";
import { WhatIfDialog } from "./what-if-dialog";

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  costPricePaise: number;
  sellingPricePaise: number;
  reorderPoint: number;
  stockQty: number;
  isActive: boolean;
}

function toFormValues(p: ProductRow): ProductFormValues {
  return {
    sku: p.sku,
    name: p.name,
    category: p.category ?? "",
    unit: p.unit,
    costPriceRupees: String(paiseToRupees(p.costPricePaise)),
    sellingPriceRupees: String(paiseToRupees(p.sellingPricePaise)),
    reorderPoint: String(p.reorderPoint),
  };
}

async function submitProduct(url: string, method: "POST" | "PATCH", values: ProductFormValues) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sku: values.sku,
      name: values.name,
      category: values.category,
      unit: values.unit,
      costPriceRupees: Number(values.costPriceRupees),
      sellingPriceRupees: Number(values.sellingPriceRupees),
      reorderPoint: Number(values.reorderPoint),
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return body.error ?? "Something went wrong.";
  }
  return null;
}

export function ProductsClient({
  initialProducts,
  role,
}: {
  initialProducts: ProductRow[];
  role: Role;
}) {
  const router = useRouter();
  const products = initialProducts;
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [simulating, setSimulating] = useState<ProductRow | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q)
    );
  }, [products, query]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this product? It will no longer appear in new sales or purchases.")) {
      return;
    }
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not deactivate product.");
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Products</h1>
          <p className="text-ink-muted mt-1 text-sm">
            {products.length} active product{products.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add product
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
        <Input
          placeholder="Search by name, SKU or category…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>SKU</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Stock</TableHeaderCell>
              <TableHeaderCell>Cost</TableHeaderCell>
              <TableHeaderCell>Price</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs text-ink-muted">{p.sku}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-ink-muted">{p.category || "—"}</TableCell>
                <TableCell>
                  {p.stockQty <= p.reorderPoint ? (
                    <Badge tone="warning">{p.stockQty} {p.unit}</Badge>
                  ) : (
                    <span>
                      {p.stockQty} {p.unit}
                    </span>
                  )}
                </TableCell>
                <TableCell>{formatPaise(p.costPricePaise)}</TableCell>
                <TableCell>{formatPaise(p.sellingPricePaise)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => setSimulating(p)}
                      className="p-1.5 rounded-md text-ink-muted hover:bg-accent-soft hover:text-accent-hover"
                      aria-label="What if?"
                      title="What if?"
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditing(p)}
                      className="p-1.5 rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {role === "OWNER" && (
                      <button
                        onClick={() => handleDeactivate(p.id)}
                        className="p-1.5 rounded-md text-ink-muted hover:bg-danger-soft hover:text-danger"
                        aria-label="Deactivate"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-ink-muted py-8">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add product">
        <ProductForm
          initial={emptyProductForm}
          submitLabel="Add product"
          onSubmit={async (values) => {
            const error = await submitProduct("/api/products", "POST", values);
            if (!error) {
              setAddOpen(false);
              refresh();
            }
            return error;
          }}
        />
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Edit product">
        {editing && (
          <ProductForm
            initial={toFormValues(editing)}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              const error = await submitProduct(`/api/products/${editing.id}`, "PATCH", values);
              if (!error) {
                setEditing(null);
                refresh();
              }
              return error;
            }}
          />
        )}
      </Dialog>

      {simulating && (
        <WhatIfDialog
          open={!!simulating}
          onClose={() => setSimulating(null)}
          productId={simulating.id}
          productName={simulating.name}
          currentPricePaise={simulating.sellingPricePaise}
        />
      )}
    </div>
  );
}
