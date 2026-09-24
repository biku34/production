"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RoleProvider, useRole } from "@/components/RoleContext";
import { Icon, type IconName } from "@/components/Icon";
import { prefetch } from "@/components/useAsync";
import { getJSON } from "@/lib/client";
import {
  ROLES,
  ROLE_LABELS,
  STAGES,
  STAGE_LABELS,
  type Role,
  type Stage,
} from "@/lib/domain";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/job-board", label: "Job Board", icon: "board" },
  { href: "/work-orders", label: "Work Orders", icon: "workorders" },
  { href: "/machines", label: "Machines", icon: "machines" },
  { href: "/reports", label: "Reports", icon: "reports" },
  { href: "/trace", label: "Traceability", icon: "trace" },
  { href: "/masters", label: "Masters", icon: "masters" },
];

const MOBILE_PRIMARY = ["/", "/job-board", "/work-orders", "/reports"];

// Primary data endpoint(s) each route needs — warmed on hover so the page
// renders from cache instead of waiting on the DB.
const PREFETCH: Record<string, string[]> = {
  "/": ["/api/reports/wip"],
  "/job-board": ["/api/work-orders"],
  "/work-orders": ["/api/work-orders?"],
  "/machines": ["/api/machines?withQueue=1"],
  "/reports": ["/api/reports/wip", "/api/jobwork"],
  "/masters": ["/api/products"],
  "/trace": [],
};

function warm(href: string) {
  for (const key of PREFETCH[href] || []) {
    prefetch(key, () => getJSON(key));
  }
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-ink-900 text-white">
        <Icon name="spool" size={17} />
      </div>
      <div className="leading-none">
        <div className="text-sm font-semibold tracking-tight text-ink-900">
          Fabric Plant
        </div>
        <div className="mt-0.5 text-[11px] text-ink-500">Production</div>
      </div>
    </div>
  );
}

function RoleSwitcher() {
  const { role, stage, setRole, setStage } = useRole();
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[11px] uppercase tracking-wide text-ink-400 sm:inline">
        Role
      </span>
      <select
        className="input !py-1.5 !w-auto max-w-[10rem] text-sm sm:max-w-none"
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {role === "StageSupervisor" && (
        <select
          className="input !py-1.5 !w-auto text-sm"
          value={stage || ""}
          onChange={(e) => setStage(e.target.value as Stage)}
        >
          {STAGES.filter((s) =>
            ["Weaving", "Dyeing", "Finishing"].includes(s)
          ).map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
      <div className="px-4 py-4">
        <Wordmark />
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        <div className="px-2 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
          Shop floor
        </div>
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              onMouseEnter={() => warm(n.href)}
              onFocus={() => warm(n.href)}
              className={`group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-ink-100 text-ink-900"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              }`}
            >
              <Icon
                name={n.icon}
                size={18}
                className={active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"}
              />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-ink-100 px-4 py-3 text-[11px] text-ink-400">
        Production Module · v1.0
      </div>
    </aside>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-200 bg-white/85 px-4 backdrop-blur sm:px-6">
      <div className="md:hidden">
        <Wordmark />
      </div>
      <div className="hidden md:block" />
      <RoleSwitcher />
    </header>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = NAV.filter((n) => MOBILE_PRIMARY.includes(n.href));

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/40 md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-ink-200" />
            <div className="section-title mb-2">All sections</div>
            <div className="grid grid-cols-3 gap-2">
              {NAV.map((n) => {
                const active = isActive(pathname, n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium ${
                      active
                        ? "border-ink-200 bg-ink-50 text-ink-900"
                        : "border-transparent text-ink-600 hover:bg-ink-50"
                    }`}
                  >
                    <Icon
                      name={n.icon}
                      size={20}
                      className={active ? "text-brand-600" : "text-ink-500"}
                    />
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Primary"
      >
        {primary.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              onTouchStart={() => warm(n.href)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium ${
                active ? "text-ink-900" : "text-ink-500"
              }`}
            >
              <Icon
                name={n.icon}
                size={20}
                className={active ? "text-brand-600" : "text-ink-400"}
              />
              {n.label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-ink-500"
        >
          <Icon name="more" size={20} className="text-ink-400" />
          More
        </button>
      </nav>
    </>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 pb-24 sm:p-6 md:pb-6">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
    </RoleProvider>
  );
}
