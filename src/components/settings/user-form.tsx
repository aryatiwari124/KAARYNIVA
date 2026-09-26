"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: "OWNER" | "STAFF";
}

export const emptyUserForm: UserFormValues = { name: "", email: "", password: "", role: "STAFF" };

export function UserForm({
  onSubmit,
}: {
  onSubmit: (values: UserFormValues) => Promise<string | null>;
}) {
  const [values, setValues] = useState<UserFormValues>(emptyUserForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) {
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
        <Label htmlFor="user-name">Name</Label>
        <Input id="user-name" required value={values.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="user-email">Email</Label>
        <Input
          id="user-email"
          type="email"
          required
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="user-password">Temporary password</Label>
        <Input
          id="user-password"
          type="text"
          required
          minLength={8}
          value={values.password}
          onChange={(e) => set("password", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="user-role">Role</Label>
        <Select id="user-role" value={values.role} onChange={(e) => set("role", e.target.value as "OWNER" | "STAFF")}>
          <option value="STAFF">Staff</option>
          <option value="OWNER">Owner</option>
        </Select>
      </div>
      <FieldError>{error ?? undefined}</FieldError>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>
      </div>
    </form>
  );
}
