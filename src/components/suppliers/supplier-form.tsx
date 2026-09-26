"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";

export interface SupplierFormValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export const emptySupplierForm: SupplierFormValues = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export function SupplierForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial: SupplierFormValues;
  onSubmit: (values: SupplierFormValues) => Promise<string | null>;
  submitLabel: string;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof SupplierFormValues>(key: K, value: SupplierFormValues[K]) {
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
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" required value={values.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" value={values.address} onChange={(e) => set("address", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
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
