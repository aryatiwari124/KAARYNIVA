"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { visibleNavItems } from "@/lib/nav";
import { cn } from "@/lib/cn";

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = visibleNavItems(role);

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col border-r border-border bg-surface shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <span className="font-display text-xl font-semibold italic text-ink">Arya</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-soft text-accent-hover"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
