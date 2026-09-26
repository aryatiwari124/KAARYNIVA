import type { PaymentStatus } from "@prisma/client";

export function derivePaymentStatus(totalPaise: number, amountPaidPaise: number): PaymentStatus {
  if (amountPaidPaise <= 0) return "UNPAID";
  if (amountPaidPaise < totalPaise) return "PARTIAL";
  return "PAID";
}
