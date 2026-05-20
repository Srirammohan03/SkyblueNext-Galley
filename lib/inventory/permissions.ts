// lib/inventory/permissions.ts

export type InventoryAction =
  | "receive"
  | "transfer"
  | "consume"
  | "adjust"
  | "manage_eligibility"
  | "view_inventory"
  | "acknowledge_alerts";

type RoleKey = "admin" | "approver" | "crew" | "director" | "pilot";

const INVENTORY_PERMISSIONS: Record<RoleKey, InventoryAction[]> = {
  admin: [
    "receive",
    "transfer",
    "consume",
    "adjust",
    "manage_eligibility",
    "view_inventory",
    "acknowledge_alerts",
  ],
  approver: [
    "receive",
    "transfer",
    "consume",
    "adjust",
    "manage_eligibility",
    "view_inventory",
    "acknowledge_alerts",
  ],
  director: ["view_inventory", "acknowledge_alerts"],
  crew: ["receive", "transfer", "consume", "view_inventory"],
  pilot: ["view_inventory"],
};

export function canPerformInventoryAction(
  role: string,
  action: InventoryAction,
): boolean {
  const allowed =
    INVENTORY_PERMISSIONS[role as RoleKey] ??
    INVENTORY_PERMISSIONS["crew"];
  return allowed.includes(action);
}

export function canAdjust(role: string): boolean {
  return canPerformInventoryAction(role, "adjust");
}

export function canReceive(role: string): boolean {
  return canPerformInventoryAction(role, "receive");
}

export function canTransfer(role: string): boolean {
  return canPerformInventoryAction(role, "transfer");
}

export function canConsume(role: string): boolean {
  return canPerformInventoryAction(role, "consume");
}

export function canManageEligibility(role: string): boolean {
  return canPerformInventoryAction(role, "manage_eligibility");
}
