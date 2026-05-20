// lib/permissions.ts

export const permissions = {
    admin: [
        "manage_users",
        "manage_vendors",
        "manage_catalog",
        "approve_orders",
        "override_orders",
        "view_all",

        "view_dashboard",
        "view_flights",
        "view_catalog",
        "view_vendors",
        "view_tracking",
        "view_settings",
        "view_users",
        "view_approvals",
        "view_reports",
        "view_inventory",
        
    ],

    director: [
        "approve_orders",
        "view_all",
        "track_orders",

        "view_dashboard",
        "view_flights",
        "view_tracking",
        "view_approvals",
        "view_catalog",
        "view_reports",
        "view_inventory",
    ],

    approver: [
        "approve_orders",
        "track_orders",

        "view_dashboard",
        "view_flights",
        "view_tracking",
        "view_approvals",
        "view_reports",
        "view_inventory",
    ],

    pilot: [
        "approve_orders",
        "view_all",

        "view_dashboard",
        "view_flights",
        "view_tracking",
        "view_inventory",
    ],

    crew: [
        "create_orders",
        "submit_orders",
        "upload_bills",

        "view_dashboard",
        "view_flights",
        "view_catalog",
        "view_inventory",
    ],
} as const;
