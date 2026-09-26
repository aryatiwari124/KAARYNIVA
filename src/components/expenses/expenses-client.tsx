"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  ExpenseForm,
  emptyExpenseForm,
  type ExpenseFormValues,
} from "./expense-form";

export interface ExpenseRow {
  id: string;
  category: string;
  amountPaise: number;
  date: string;
  note: string | null;
}

function toFormValues(e: ExpenseRow): ExpenseFormValues {
  return {
    category: e.category,
    amountRupees: String(paiseToRupees(e.amountPaise)),
    date: e.date.slice(0, 10),
    note: e.note ?? "",
  };
}

async function submitExpense(url: string, method: "POST" | "PATCH", values: ExpenseFormValues) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: values.category,
      amountRupees: Number(values.amountRupees),
      date: values.date,
      note: values.note,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return body.error ?? "Something went wrong.";
  }
  return null;
}

export function ExpensesClient({
  initialExpenses,
  role,
}: {
  initialExpenses: ExpenseRow[];
  role: Role;
}) {
  const router = useRouter();
  const expenses = initialExpenses;
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [, startTransition] = useTransition();

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amountPaise, 0),
    [expenses]
  );

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not delete expense.");
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Expenses</h1>
          <p className="text-ink-muted mt-1 text-sm">
            {expenses.length} recorded · {formatPaise(total)} total
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add expense
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Note</TableHeaderCell>
              <TableHeaderCell>Amount</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-ink-muted">
                  {new Date(e.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="font-medium">{e.category}</TableCell>
                <TableCell className="text-ink-muted max-w-xs truncate">{e.note || "—"}</TableCell>
                <TableCell>{formatPaise(e.amountPaise)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => setEditing(e)}
                      className="p-1.5 rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {role === "OWNER" && (
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1.5 rounded-md text-ink-muted hover:bg-danger-soft hover:text-danger"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {expenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-ink-muted py-8">
                  No expenses recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add expense">
        <ExpenseForm
          initial={emptyExpenseForm()}
          submitLabel="Add expense"
          onSubmit={async (values) => {
            const error = await submitExpense("/api/expenses", "POST", values);
            if (!error) {
              setAddOpen(false);
              refresh();
            }
            return error;
          }}
        />
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Edit expense">
        {editing && (
          <ExpenseForm
            initial={toFormValues(editing)}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              const error = await submitExpense(`/api/expenses/${editing.id}`, "PATCH", values);
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
