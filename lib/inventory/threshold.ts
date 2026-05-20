// lib/inventory/threshold.ts

export interface ThresholdConfig {
  reorderThresholdType: string; // "PACK" | "UNIT"
  reorderThresholdValue: number;
  packEnabled: boolean;
  packSize: number | null;
}

/** Return the low-stock threshold expressed in base units */
export function getThresholdBaseUnits(item: ThresholdConfig): number {
  let threshold = item.reorderThresholdValue;
  if (
    item.reorderThresholdType === "PACK" &&
    item.packEnabled &&
    item.packSize
  ) {
    threshold = item.reorderThresholdValue * item.packSize;
  }
  // User requested: "if item qty is less then 10- 5 give me alert boss"
  return Math.max(threshold, 10);
}

/** True when warehouse stock is below the configured threshold */
export function isLowStock(
  onHandBaseUnits: number,
  item: ThresholdConfig,
): boolean {
  return onHandBaseUnits < getThresholdBaseUnits(item);
}

/** 0 = no stock, 1 = exactly at threshold, >1 = comfortable */
export function getCoverageRatio(
  onHandBaseUnits: number,
  item: ThresholdConfig,
): number {
  const threshold = getThresholdBaseUnits(item);
  if (threshold === 0) return Infinity;
  return onHandBaseUnits / threshold;
}
