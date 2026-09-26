import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ExpensesClient } from "@/components/expenses/expenses-client";

export default async function ExpensesPage() {
  const session = await auth();
  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });

  return (
    <ExpensesClient
      initialExpenses={JSON.parse(JSON.stringify(expenses))}
      role={session!.user.role}
    />
  );
}
