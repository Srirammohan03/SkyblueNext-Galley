// lib/inventory/conversion.ts

export interface CatalogItemConfig {
  packEnabled: boolean;
  packSize: number | null;
  packLabel: string | null;
  baseUnit: string;
}

/** Convert packs (+ optional extra units) → base units */
export function packsToBaseUnits(
  packs: number,
  packSize: number,
  extraUnits = 0,
): number {
  return Math.round(packs * packSize + extraUnits);
}

/** Split base units into whole packs + remainder units */
export function baseUnitsToPacks(
  baseUnits: number,
  packSize: number,
): { packs: number; remainder: number } {
  const packs = Math.floor(baseUnits / packSize);
  const remainder = baseUnits % packSize;
  return { packs, remainder };
}

/** Human-readable warehouse stock string, e.g. "3 packs + 6 cans" */
export function displayWarehouseStock(
  onHandBaseUnits: number,
  item: CatalogItemConfig,
): string {
  if (!item.packEnabled || !item.packSize) {
    const u = item.baseUnit || "unit";
    return `${onHandBaseUnits} ${u}${onHandBaseUnits !== 1 ? "s" : ""}`;
  }
  const { packs, remainder } = baseUnitsToPacks(onHandBaseUnits, item.packSize);
  const packWord = item.packLabel || "pack";
  const baseWord = item.baseUnit || "unit";
  if (remainder === 0) {
    return `${packs} ${packWord}${packs !== 1 ? "s" : ""}`;
  }
  return `${packs} ${packWord}${packs !== 1 ? "s" : ""} + ${remainder} ${baseWord}${remainder !== 1 ? "s" : ""}`;
}

/** Human-readable onboard stock string (always base units), e.g. "14 cans" */
export function displayOnboardStock(
  onHandBaseUnits: number,
  item: CatalogItemConfig,
): string {
  const u = item.baseUnit || "unit";
  return `${onHandBaseUnits} ${u}${onHandBaseUnits !== 1 ? "s" : ""}`;
}

/** Pack equivalent as a decimal for reporting */
export function getPackEquivalent(baseUnits: number, packSize: number): number {
  if (packSize <= 0) return 0;
  return baseUnits / packSize;
}
