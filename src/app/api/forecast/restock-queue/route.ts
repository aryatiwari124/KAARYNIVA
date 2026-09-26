import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { handleApiError } from "@/lib/api/errors";
import { getAllProductForecasts } from "@/lib/forecast";

export async function GET() {
  try {
    await requireSession();
    const forecasts = await getAllProductForecasts();
    // Most urgent (soonest stockout) first; products with no projected stockout sort last.
    forecasts.sort((a, b) => {
      const da = a.stockout.daysUntilStockout;
      const db = b.stockout.daysUntilStockout;
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
    return NextResponse.json({ forecasts });
  } catch (error) {
    return handleApiError(error);
  }
}
