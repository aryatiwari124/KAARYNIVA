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
import { CustomerForm, emptyCustomerForm, type CustomerFormValues } from "./customer-form";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
}

function toFormValues(c: CustomerRow): CustomerFormValues {
  return {
    name: c.name,
    phone: c.phone ?? "",
    email: c.email ?? "",
    address: c.address ?? "",
    notes: c.notes ?? "",
  };
}

function truncate(value: string | null, max = 40) {
  if (!value) return "—";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

async function submitCustomer(url: string, method: "POST" | "PATCH", values: CustomerFormValues) {
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

export function CustomersClient({
  initialCustomers,
  role,
}: {
  initialCustomers: CustomerRow[];
  role: Role;
}) {
  const router = useRouter();
  const customers = initialCustomers;
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!query.trim()) return customers;
    const q = query.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
    );
  }, [customers, query]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this customer? They will no longer appear when recording new sales.")) {
      return;
    }
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (res.ok) {
      refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not deactivate customer.");
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Customers</h1>
          <p className="text-ink-muted mt-1 text-sm">
            {customers.length} active customer{customers.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add customer
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
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-ink-muted">{c.phone || "—"}</TableCell>
                <TableCell className="text-ink-muted">{c.email || "—"}</TableCell>
                <TableCell className="text-ink-muted">{truncate(c.address)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => setEditing(c)}
                      className="p-1.5 rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {role === "OWNER" && (
                      <button
                        onClick={() => handleDeactivate(c.id)}
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
                  No customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add customer">
        <CustomerForm
          initial={emptyCustomerForm}
          submitLabel="Add customer"
          onSubmit={async (values) => {
            const error = await submitCustomer("/api/customers", "POST", values);
            if (!error) {
              setAddOpen(false);
              refresh();
            }
            return error;
          }}
        />
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Edit customer">
        {editing && (
          <CustomerForm
            initial={toFormValues(editing)}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              const error = await submitCustomer(`/api/customers/${editing.id}`, "PATCH", values);
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
