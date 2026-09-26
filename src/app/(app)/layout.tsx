import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/topbar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar role={session.user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar name={session.user.name ?? session.user.email ?? "User"} role={session.user.role} />
        <main className="flex-1 overflow-y-auto bg-paper p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
