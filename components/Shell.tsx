"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RoleProvider, useRole } from "@/components/RoleContext";
import { Icon, type IconName } from "@/components/Icon";
import { prefetch } from "@/components/useAsync";
import { getJSON, postJSON } from "@/lib/client";
import { ROLE_LABELS, type Role } from "@/lib/domain";
import { canAccessPath } from "@/lib/access";

/** Nav items this role may open (children filtered too). */
function navFor(role: Role | null): NavItem[] {
  if (!role) return [];
  return NAV.filter((n) => canAccessPath(role, n.href)).map((n) => ({
    ...n,
    children: n.children?.filter((c) => canAccessPath(role, c.href)),
  }));
}

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  children?: { href: string; label: string; icon: IconName }[];
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  {
    href: "/job-board",
    label: "Job Board",
    icon: "board",
    children: [
      { href: "/job-board/cockpit", label: "WIP Cockpit", icon: "machines" },
    ],
  },
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
  "/job-board/cockpit": ["/api/work-orders"],
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
      <div className="grid h-8 w-8 place-items-center rounded-md bg-ink-900 text-ink-50">
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

function UserMenu() {
  const { user, role, stage, loading } = useRole();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await postJSON("/api/auth/logout", {});
    } catch {
      /* clear locally regardless */
    }
    router.replace("/login");
    router.refresh();
  }

  if (loading && !user) {
    return <span className="text-xs text-ink-400">…</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 text-right leading-tight">
        <div className="truncate text-sm font-medium text-ink-900">
          {user?.name ?? "Not signed in"}
        </div>
        <div className="truncate text-[11px] text-ink-500">
          {role ? ROLE_LABELS[role] : "—"}
          {stage ? ` · ${stage}` : ""}
        </div>
      </div>
      <div
        className="grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-xs font-semibold text-ink-50"
        aria-hidden
      >
        {(user?.name ?? "?").slice(0, 1).toUpperCase()}
      </div>
      <button
        className="btn-ghost btn-sm"
        onClick={logout}
        disabled={busy}
        title="Sign out"
      >
        <Icon name="close" size={14} />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { role } = useRole();
  const items = navFor(role);
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
      <div className="px-4 py-4">
        <Wordmark />
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        <div className="px-2 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
          Shop floor
        </div>
        {items.map((n) => {
          const branchActive = isActive(pathname, n.href);
          // With children, the parent highlights only on its exact route so the
          // active child gets its own highlight.
          const selfActive = n.children ? pathname === n.href : branchActive;
          return (
            <div key={n.href}>
              <Link
                href={n.href}
                onMouseEnter={() => warm(n.href)}
                onFocus={() => warm(n.href)}
                className={`group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                  selfActive
                    ? "bg-ink-100 text-ink-900"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                }`}
              >
                <Icon
                  name={n.icon}
                  size={18}
                  className={selfActive ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"}
                />
                {n.label}
              </Link>
              {n.children && branchActive && (
                <div className="mt-0.5 space-y-0.5 pl-4">
                  {n.children.map((c) => {
                    const cActive = pathname.startsWith(c.href);
                    return (
                      <Link
                        key={c.href}
                        href={c.href}
                        onMouseEnter={() => warm(c.href)}
                        onFocus={() => warm(c.href)}
                        className={`group flex items-center gap-2.5 rounded-md border-l border-ink-200 px-2.5 py-1.5 text-sm font-medium transition-colors ${
                          cActive
                            ? "bg-ink-100 text-ink-900"
                            : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
                        }`}
                      >
                        <Icon
                          name={c.icon}
                          size={16}
                          className={cActive ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"}
                        />
                        {c.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
      <UserMenu />
    </header>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const { role } = useRole();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = navFor(role);
  const primary = items.filter((n) => MOBILE_PRIMARY.includes(n.href));

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
              {items.flatMap((n) => [n, ...(n.children || [])]).map((n) => {
                const active =
                  n.href === "/job-board"
                    ? pathname === "/job-board"
                    : isActive(pathname, n.href);
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

function Main({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The job board is a canvas — let it use the full viewport width.
  const fluid = pathname.startsWith("/job-board");
  return (
    <main
      className={`w-full flex-1 p-4 pb-24 sm:p-6 md:pb-6 ${
        fluid ? "max-w-none" : "mx-auto max-w-[1400px]"
      }`}
    >
      {children}
    </main>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The login route renders full-bleed, without the app chrome or a session
  // provider (there is no user yet).
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <RoleProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <Main>{children}</Main>
        </div>
      </div>
      <MobileNav />
    </RoleProvider>
  );
}
