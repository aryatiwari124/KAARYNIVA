import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAiEnabled } from "@/lib/ai/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UsersClient } from "@/components/settings/users-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Settings</h1>
        <p className="text-ink-muted mt-1 text-sm">Owner-only controls for your team and integrations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI insights</CardTitle>
          <CardDescription>Grounded narratives shown across the dashboard, restock queue, and customer pages.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          {isAiEnabled() ? (
            <Badge tone="success">Enabled</Badge>
          ) : (
            <Badge tone="neutral">Disabled — computed insights only</Badge>
          )}
          <p className="text-sm text-ink-muted">
            {isAiEnabled()
              ? "An API key is configured. Insights are narrated by Claude and grounded in your data."
              : "Set ANTHROPIC_API_KEY and AI_INSIGHTS_ENABLED=true in your environment to turn this on. Everything works without it — insights fall back to computed summaries."}
          </p>
        </CardContent>
      </Card>

      <UsersClient initialUsers={users} currentUserId={session.user.id} />
    </div>
  );
}
