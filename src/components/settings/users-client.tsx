"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { UserForm, type UserFormValues } from "./user-form";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "STAFF";
  isActive: boolean;
}

export function UsersClient({ initialUsers, currentUserId }: { initialUsers: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const users = initialUsers;
  const [addOpen, setAddOpen] = useState(false);
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function toggleActive(user: UserRow) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) {
      refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not update user.");
    }
  }

  async function createUser(values: UserFormValues) {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return body.error ?? "Something went wrong.";
    }
    setAddOpen(false);
    refresh();
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Team accounts</h2>
          <p className="text-sm text-ink-muted mt-1">Owners can manage everything; staff can't void sales or manage the team.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add account
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.name} {u.id === currentUserId && <span className="text-ink-muted font-normal">(you)</span>}
                </TableCell>
                <TableCell className="text-ink-muted">{u.email}</TableCell>
                <TableCell>
                  <Badge tone={u.role === "OWNER" ? "accent" : "neutral"}>{u.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge tone={u.isActive ? "success" : "neutral"}>{u.isActive ? "Active" : "Deactivated"}</Badge>
                </TableCell>
                <TableCell>
                  {u.id !== currentUserId && (
                    <button
                      onClick={() => toggleActive(u)}
                      className="p-1.5 rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink justify-self-end"
                      aria-label={u.isActive ? "Deactivate" : "Reactivate"}
                      title={u.isActive ? "Deactivate" : "Reactivate"}
                    >
                      {u.isActive ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add team account">
        <UserForm onSubmit={createUser} />
      </Dialog>
    </div>
  );
}
