"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export interface ProductFormValues {
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPriceRupees: string;
  sellingPriceRupees: string;
  reorderPoint: string;
}

export const emptyProductForm: ProductFormValues = {
  sku: "",
  name: "",
  category: "",
  unit: "pc",
  costPriceRupees: "",
  sellingPriceRupees: "",
  reorderPoint: "0",
};

export function ProductForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial: ProductFormValues;
  onSubmit: (values: ProductFormValues) => Promise<string | null>;
  submitLabel: string;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const errorMessage = await onSubmit(values);
    setLoading(false);
    if (errorMessage) setError(errorMessage);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" required value={values.sku} onChange={(e) => set("sku", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="unit">Unit</Label>
          <Input
            id="unit"
            required
            placeholder="pc, kg, box…"
            value={values.unit}
            onChange={(e) => set("unit", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" required value={values.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={values.category}
          onChange={(e) => set("category", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="costPrice">Cost price (₹)</Label>
          <Input
            id="costPrice"
            type="number"
            min="0"
            step="0.01"
            required
            value={values.costPriceRupees}
            onChange={(e) => set("costPriceRupees", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="sellingPrice">Selling price (₹)</Label>
          <Input
            id="sellingPrice"
            type="number"
            min="0"
            step="0.01"
            required
            value={values.sellingPriceRupees}
            onChange={(e) => set("sellingPriceRupees", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="reorderPoint">Reorder point</Label>
        <Input
          id="reorderPoint"
          type="number"
          min="0"
          step="1"
          value={values.reorderPoint}
          onChange={(e) => set("reorderPoint", e.target.value)}
        />
      </div>
      <FieldError>{error ?? undefined}</FieldError>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
