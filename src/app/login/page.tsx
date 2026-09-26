"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Crown, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const DEMO_PASSWORD = "password123";
const DEMO_ACCOUNTS = {
  owner: { email: "owner@arya.test", label: "Demo as Owner", icon: Crown },
  staff: { email: "staff@arya.test", label: "Demo as Staff", icon: UserRound },
} as const;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<"owner" | "staff" | null>(null);

  async function doLogin(loginEmail: string, loginPassword: string) {
    const result = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    });
    if (result?.error) {
      setError("Incorrect email or password.");
      return false;
    }
    router.push(params.get("callbackUrl") || "/");
    router.refresh();
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await doLogin(email, password);
    setLoading(false);
  }

  async function handleDemoLogin(kind: "owner" | "staff") {
    setError(null);
    setDemoLoading(kind);
    await doLogin(DEMO_ACCOUNTS[kind].email, DEMO_PASSWORD);
    setDemoLoading(null);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold italic text-ink">Arya</h1>
          <p className="text-ink-muted text-sm mt-2">Know your business, not just your numbers.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use the account your owner set up for you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(DEMO_ACCOUNTS) as [keyof typeof DEMO_ACCOUNTS, (typeof DEMO_ACCOUNTS)[keyof typeof DEMO_ACCOUNTS]][]).map(
                ([kind, account]) => {
                  const Icon = account.icon;
                  return (
                    <Button
                      key={kind}
                      type="button"
                      variant="outline"
                      onClick={() => handleDemoLogin(kind)}
                      disabled={demoLoading !== null || loading}
                    >
                      <Icon className="h-4 w-4" />
                      {demoLoading === kind ? "Signing in…" : account.label}
                    </Button>
                  );
                }
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-ink-muted uppercase tracking-wide">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <FieldError>{error ?? undefined}</FieldError>
              <Button type="submit" className="w-full" disabled={loading || demoLoading !== null}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
