"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, LogIn, Eye } from "lucide-react";
import type { Role } from "@prisma/client";
import { visibleNavItems } from "@/lib/nav";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { useDemoGuard } from "@/components/auth/demo-guard";

export function TopBar({
  name,
  role,
  isDemo,
}: {
  name: string;
  role: Role;
  isDemo?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const items = visibleNavItems(role);
  const { showLoginModal } = useDemoGuard();

  return (
    <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-surface-muted"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-lg font-semibold italic text-ink">Arya</span>
      </div>

      <div className="hidden md:flex items-center gap-2">
        {isDemo && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Eye className="h-3.5 w-3.5" />
            Demo Mode ({role === "OWNER" ? "Owner" : "Staff"})
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-ink leading-tight">{name}</p>
          <p className="text-xs text-ink-muted leading-tight">{role === "OWNER" ? "Owner" : "Staff"}</p>
        </div>

        {isDemo ? (
          <button
            onClick={() => showLoginModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-accent-contrast hover:bg-accent-hover transition-colors"
          >
            <LogIn className="h-3.5 w-3.5" />
            Log In
          </button>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>

      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Arya">
        <nav className="flex flex-col gap-1 -mx-2">
          {items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active ? "bg-accent-soft text-accent-hover" : "text-ink hover:bg-surface-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </Dialog>
    </header>
  );
}
