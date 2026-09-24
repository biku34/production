"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RoleProvider, useRole } from "@/components/RoleContext";
import {
  ROLES,
  ROLE_LABELS,
  STAGES,
  STAGE_LABELS,
  type Role,
  type Stage,
} from "@/lib/domain";

const NAV = [
  { href: "/", label: "Dashboard", icon: "▤" },
  { href: "/job-board", label: "Job Board", icon: "▦" },
  { href: "/work-orders", label: "Work Orders", icon: "🗂" },
  { href: "/machines", label: "Machines", icon: "⚙" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/trace", label: "Traceability", icon: "🔎" },
  { href: "/masters", label: "Masters", icon: "🧩" },
];

// Primary destinations for the mobile bottom bar; the rest live in "More".
const MOBILE_PRIMARY = ["/", "/job-board", "/work-orders", "/reports"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function RoleSwitcher() {
  const { role, stage, setRole, setStage } = useRole();
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-500 hidden sm:inline">Acting as</span>
      <select
        className="input !py-1.5 !w-auto text-sm max-w-[9.5rem] sm:max-w-none"
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
    <aside className="w-60 shrink-0 border-r border-ink-300/60 bg-white hidden md:flex md:flex-col">
      <div className="px-5 py-4 border-b border-ink-100">
        <div className="text-sm font-bold text-brand-700">FABRIC PLANT</div>
        <div className="text-xs text-ink-500">Production Module</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-700 hover:bg-ink-100"
              }`}
            >
              <span className="w-4 text-center">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 text-[11px] text-ink-500 border-t border-ink-100">
        SRS v1.0 · Demo build
      </div>
    </aside>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-300/60 bg-white/90 backdrop-blur px-4 sm:px-5 py-3">
      <div className="md:hidden flex items-center gap-2 text-sm font-bold text-brand-700">
        <span aria-hidden>🧵</span> Fabric · Production
      </div>
      <div className="flex-1" />
      <RoleSwitcher />
    </header>
  );
}

/** Bottom tab bar for phones; hidden on desktop where the sidebar is used. */
function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = NAV.filter((n) => MOBILE_PRIMARY.includes(n.href));

  return (
    <>
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-200" />
            <div className="text-sm font-semibold mb-2">All sections</div>
            <div className="grid grid-cols-3 gap-2">
              {NAV.map((n) => {
                const active = isActive(pathname, n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-medium ${
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-ink-700 hover:bg-ink-100"
                    }`}
                  >
                    <span className="text-lg">{n.icon}</span>
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-ink-300/60 flex items-stretch pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        {primary.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
                active ? "text-brand-700" : "text-ink-500"
              }`}
            >
              <span className="text-lg leading-none">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-ink-500"
        >
          <span className="text-lg leading-none">⋯</span>
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
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-4 sm:p-5 pb-24 md:pb-5 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
    </RoleProvider>
  );
}
