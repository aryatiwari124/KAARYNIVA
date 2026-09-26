"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Plus, Pencil, Ban, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/table";
import { SupplierForm, emptySupplierForm, type SupplierFormValues } from "./supplier-form";

export interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
}

function toFormValues(s: SupplierRow): SupplierFormValues {
  return {
    name: s.name,
    phone: s.phone ?? "",
    email: s.email ?? "",
    address: s.address ?? "",
    notes: s.notes ?? "",
  };
}

async function submitSupplier(url: string, method: "POST" | "PATCH", values: SupplierFormValues) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: values.name,
      phone: values.phone,
      email: values.email,
      address: values.address,
      notes: values.notes,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return body.error ?? "Something went wrong.";
  }
  return null;
}

function truncate(text: string | null, max = 40) {
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function SuppliersClient({
  initialSuppliers,
  role,
}: {
  initialSuppliers: SupplierRow[];
  role: Role;
}) {
  const router = useRouter();
  const suppliers = initialSuppliers;
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!query.trim()) return suppliers;
    const q = query.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q)
    );
  }, [suppliers, query]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this supplier? It will no longer appear in new purchases.")) {
      return;
    }
    const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    if (res.ok) {
      refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not deactivate supplier.");
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Suppliers</h1>
          <p className="text-ink-muted mt-1 text-sm">
            {suppliers.length} active supplier{suppliers.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add supplier
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
        <Input
          placeholder="Search by name, phone or email…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Phone</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Address</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-ink-muted">{s.phone || "—"}</TableCell>
                <TableCell className="text-ink-muted">{s.email || "—"}</TableCell>
                <TableCell className="text-ink-muted">{truncate(s.address)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => setEditing(s)}
                      className="p-1.5 rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {role === "OWNER" && (
                      <button
                        onClick={() => handleDeactivate(s.id)}
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
                <TableCell colSpan={5} className="text-center text-ink-muted py-8">
                  No suppliers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add supplier">
        <SupplierForm
          initial={emptySupplierForm}
          submitLabel="Add supplier"
          onSubmit={async (values) => {
            const error = await submitSupplier("/api/suppliers", "POST", values);
            if (!error) {
              setAddOpen(false);
              refresh();
            }
            return error;
          }}
        />
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Edit supplier">
        {editing && (
          <SupplierForm
            initial={toFormValues(editing)}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              const error = await submitSupplier(`/api/suppliers/${editing.id}`, "PATCH", values);
              if (!error) {
                setEditing(null);
                refresh();
              }
              return error;
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
