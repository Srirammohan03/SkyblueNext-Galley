// components\dashboard-layout.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Plane,
  Utensils,
  ShoppingBasket,
  Store,
  CheckSquare,
  Package,
  Users,
  Settings as SettingsIcon,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ChevronRight,
  BarChart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/has-permission";
import { permissions } from "@/lib/permissions";

const NavItem = ({
  href,
  icon: Icon,
  label,
  isCollapsed,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
}) => {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group",
        isActive
          ? "bg-white/20 text-white shadow-sm"
          : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon
        className={cn(
          "w-5 h-5 shrink-0 transition-transform group-hover:scale-110",
          isActive && "text-white",
        )}
      />
      {!isCollapsed && (
        <span className="text-sm font-medium whitespace-nowrap">{label}</span>
      )}
      {isActive && !isCollapsed && (
        <motion.div
          layoutId="active-nav"
          className="ml-auto"
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ChevronRight className="w-4 h-4 opacity-50" />
        </motion.div>
      )}
    </Link>
  );
};

const Logo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M55 25 H 40 L 15 50 L 40 75 H 55 L 30 50 Z" fill="white" />
    <path d="M85 25 H 70 L 45 50 L 70 75 H 85 L 60 50 Z" fill="#F27C22" />
  </svg>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const user = session?.user;

  const userPermissions = (user as any)?.permissions?.length
    ? (user as any).permissions
    : permissions[((user as any)?.role || "crew") as keyof typeof permissions];
  const navigation = {
    core: [
      {
        href: "/dashboard",
        icon: LayoutDashboard,
        label: "Dashboard",
        permission: "view_dashboard",
      },

      {
        href: "/flights",
        icon: Plane,
        label: "Flights",
        permission: "view_flights",
      },

      {
        href: "/catalog/food",
        icon: Utensils,
        label: "Food Catalog",
        permission: "view_catalog",
      },

      {
        href: "/catalog/grocery",
        icon: ShoppingBasket,
        label: "Grocery Catalog",
        permission: "view_catalog",
      },

      {
        href: "/vendors",
        icon: Store,
        label: "Vendors",
        permission: "view_vendors",
      },
    ],

    operations: [
      {
        href: "/approvals",
        icon: CheckSquare,
        label: "Approvals",
        permission: "view_approvals",
      },

      {
        href: "/tracking",
        icon: Package,
        label: "Order Tracking",
        permission: "view_tracking",
      },

      {
        href: "/users",
        icon: Users,
        label: "User Management",
        permission: "view_users",
      },

      {
        href: "/reports",
        icon: BarChart,
        label: "Reports",
        permission: "view_reports",
      },
    ],
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#1868A5] text-white border-r border-white/10 backdrop-blur-xl">
      <div className="p-4 flex items-center justify-between border-b border-white/10 h-16 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md shadow-lg ring-1 ring-white/10 shrink-0">
            <Logo className="h-7 w-7" />
          </div>

          {!isCollapsed && (
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[18px] font-black tracking-wide text-white truncate">
                SKYBLUE
              </span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden text-white hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <section>
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">
              Core
            </p>
          )}
          <nav className="space-y-1">
            {navigation.core
              .filter((item) =>
                userPermissions?.includes(item.permission as never),
              )
              .map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isCollapsed={isCollapsed}
                />
              ))}
          </nav>
        </section>

        <section>
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">
              Operations
            </p>
          )}
          <nav className="space-y-1">
            {navigation.operations
              .filter((item) =>
                userPermissions?.includes(item.permission as never),
              )
              .map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isCollapsed={isCollapsed}
                />
              ))}
          </nav>
        </section>
      </div>

      <div className="p-4 border-t border-white/10 bg-black/5">
        {!isCollapsed && (
          <div className="mb-4 px-2">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-[10px] text-white/50 uppercase tracking-wider">
              {(user as any)?.role}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={() => signOut()}
          className={cn(
            "w-full justify-start text-white/70 hover:text-white hover:bg-white/10 rounded-xl",
            isCollapsed && "justify-center px-0",
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && (
            <span className="ml-3 text-sm font-medium">Sign Out</span>
          )}
        </Button>
        <p className="mt-10 text-center text-sm text-gray-500 lg:hidden">
          © {new Date().getFullYear()} RS Fisheries. All rights reserved.{" "}
          Powered by{" "}
          <Link
            href="https://www.outrightcreators.com/"
            className="font-medium text-[#139BC3] hover:underline"
          >
            Outright Creators
          </Link>
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 z-50 flex flex-col lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col transition-all duration-300 overflow-hidden shrink-0 shadow-2xl z-30",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              <Menu className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </Button>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest hidden md:block">
              {pathname.split("/").filter(Boolean).join(" / ") || "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900">{user?.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
                {(user as any)?.role}
              </p>
            </div>
            <div className="w-10 h-10 overflow-hidden rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner transition-transform hover:scale-105 cursor-pointer">
              {user?.image ? (
                <img
                  src={user?.image}
                  referrerPolicy="no-referrer"
                  alt={user?.name || ""}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                user?.name?.charAt(0) || "U"
              )}
            </div>
          </div>
        </header>

        <main
          className="
    flex-1
    overflow-auto
    bg-slate-50
    p-6
    md:p-8
    [scrollbar-width:none]
    [-ms-overflow-style:none]
    [&::-webkit-scrollbar]:hidden
  "
        >
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
