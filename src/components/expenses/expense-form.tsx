"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { useDemoGuard } from "@/components/auth/demo-guard";

const COMMON_CATEGORIES = [
  "Rent",
  "Salaries",
  "Utilities",
  "Transport",
  "Marketing",
  "Maintenance",
  "Packaging",
  "Miscellaneous",
];

export interface ExpenseFormValues {
  category: string;
  amountRupees: string;
  date: string; // yyyy-mm-dd
  note: string;
}

export function emptyExpenseForm(): ExpenseFormValues {
  return {
    category: "",
    amountRupees: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  };
}

export function ExpenseForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial: ExpenseFormValues;
  onSubmit: (values: ExpenseFormValues) => Promise<string | null>;
  submitLabel: string;
}) {
  const { requireLogin } = useDemoGuard();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (requireLogin("Recording an expense requires a registered user account.")) return;
    setError(null);
    setLoading(true);
    const errorMessage = await onSubmit(values);
    setLoading(false);
    if (errorMessage) setError(errorMessage);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          list="expense-categories"
          required
          value={values.category}
          onChange={(e) => set("category", e.target.value)}
        />
        <datalist id="expense-categories">
          {COMMON_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Amount (₹)</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            required
            value={values.amountRupees}
            onChange={(e) => set("amountRupees", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            required
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" rows={3} value={values.note} onChange={(e) => set("note", e.target.value)} />
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
