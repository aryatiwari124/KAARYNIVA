import { prisma } from "@/lib/prisma";
import { getDailyDemandSeries } from "./daily-demand";
import { buildForecastModel } from "./model";
import { projectStockout, type StockoutProjection } from "./stockout";
import { recommendReorder, type ReorderRecommendation } from "./reorder";
import { backtestSeries, type BacktestResult } from "./backtest";

export * from "./daily-demand";
export * from "./model";
export * from "./stockout";
export * from "./reorder";
export * from "./backtest";

const HISTORY_DAYS = 56; // 8 weeks — enough for day-of-week factors + a trend split

export interface ProductForecast {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  stockQty: number;
  stockout: StockoutProjection;
  reorder: ReorderRecommendation;
  backtest: BacktestResult;
}

export async function getProductForecast(
  productId: string,
  opts?: { horizonDays?: number; leadTimeDays?: number }
): Promise<ProductForecast | null> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return null;

  const series = await getDailyDemandSeries(productId, HISTORY_DAYS);
  const model = buildForecastModel(series);

  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    stockQty: product.stockQty,
    stockout: projectStockout(model, product.stockQty, opts?.horizonDays ?? 30),
    reorder: recommendReorder(model, product.stockQty, { leadTimeDays: opts?.leadTimeDays }),
    backtest: backtestSeries(series, 14),
  };
}

/** Forecasts every active product — used to power the restock queue. */
export async function getAllProductForecasts(opts?: {
  horizonDays?: number;
  leadTimeDays?: number;
}): Promise<ProductForecast[]> {
  const products = await prisma.product.findMany({ where: { isActive: true } });
  return Promise.all(
    products.map(async (product) => {
      const series = await getDailyDemandSeries(product.id, HISTORY_DAYS);
      const model = buildForecastModel(series);
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        stockQty: product.stockQty,
        stockout: projectStockout(model, product.stockQty, opts?.horizonDays ?? 30),
        reorder: recommendReorder(model, product.stockQty, { leadTimeDays: opts?.leadTimeDays }),
        backtest: backtestSeries(series, 14),
      };
    })
  );
}
