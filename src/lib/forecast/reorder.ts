import type { ForecastModel } from "./model";
import { dampedTrendSum } from "./model";

export const DEFAULT_LEAD_TIME_DAYS = 7;
/** z-score for a ~95% cycle-service level. */
export const DEFAULT_SERVICE_LEVEL_Z = 1.65;
/** Order-up-to level covers lead time plus this many additional days of demand. */
export const DEFAULT_REVIEW_CYCLE_DAYS = 14;

export interface ReorderRecommendation {
  leadTimeDays: number;
  serviceLevelZ: number;
  /** Near-term expected daily demand (level + damped trend to mid-lead-time), used for sizing. */
  projectedDailyDemand: number;
  safetyStockUnits: number;
  reorderPointUnits: number;
  suggestedOrderQtyUnits: number;
}

/**
 * Classic (Q, R) reorder-point sizing: reorder point = lead-time demand +
 * safety stock, where safety stock = z * demand stddev * sqrt(lead time) —
 * the standard formula for demand uncertainty during replenishment lead
 * time. The suggested order quantity brings stock up to an order-up-to
 * level that also covers a review cycle beyond the lead time, net of what's
 * already on hand.
 */
export function recommendReorder(
  model: ForecastModel,
  currentStock: number,
  opts?: { leadTimeDays?: number; serviceLevelZ?: number; reviewCycleDays?: number }
): ReorderRecommendation {
  const leadTimeDays = opts?.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;
  const serviceLevelZ = opts?.serviceLevelZ ?? DEFAULT_SERVICE_LEVEL_Z;
  const reviewCycleDays = opts?.reviewCycleDays ?? DEFAULT_REVIEW_CYCLE_DAYS;

  // Trend contribution at the midpoint of the lead time, as a representative
  // near-term daily rate (avoids over/under-weighting the trend at either edge).
  const midLeadTime = Math.max(1, Math.round(leadTimeDays / 2));
  const projectedDailyDemand = Math.max(
    0,
    model.level + model.trendPerDay * (dampedTrendSum(midLeadTime) / midLeadTime)
  );

  const safetyStockUnits = serviceLevelZ * model.stdDevDailyDemand * Math.sqrt(leadTimeDays);
  const reorderPointUnits = projectedDailyDemand * leadTimeDays + safetyStockUnits;
  const orderUpToLevel = projectedDailyDemand * (leadTimeDays + reviewCycleDays) + safetyStockUnits;
  const suggestedOrderQtyUnits = Math.max(0, Math.round(orderUpToLevel - currentStock));

  return {
    leadTimeDays,
    serviceLevelZ,
    projectedDailyDemand,
    safetyStockUnits,
    reorderPointUnits: Math.round(reorderPointUnits),
    suggestedOrderQtyUnits,
  };
}
