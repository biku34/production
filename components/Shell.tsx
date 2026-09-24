"use client";

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

function RoleSwitcher() {
  const { role, stage, setRole, setStage } = useRole();
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-500 hidden sm:inline">Acting as</span>
      <select
        className="input !py-1.5 !w-auto text-sm"
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
          const active =
            n.href === "/"
              ? pathname === "/"
              : pathname.startsWith(n.href);
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
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-300/60 bg-white/90 backdrop-blur px-5 py-3">
      <div className="md:hidden text-sm font-bold text-brand-700">
        Fabric · Production
      </div>
      <div className="flex-1" />
      <RoleSwitcher />
    </header>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-5 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </RoleProvider>
  );
}
