import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ReceiptText,
  ShoppingCart,
  Wallet,
  TrendingUp,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  minRole?: Role;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Sales", icon: ReceiptText },
  { href: "/purchases", label: "Purchases", icon: ShoppingCart },
  { href: "/products", label: "Products", icon: Package },
  { href: "/restock", label: "Restock", icon: TrendingUp },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings, minRole: "OWNER" },
];

export function visibleNavItems(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.minRole || item.minRole === role);
}
