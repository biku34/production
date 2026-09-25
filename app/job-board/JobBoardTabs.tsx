"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { prefetch } from "@/components/useAsync";
import { getJSON } from "@/lib/client";
import { Icon, type IconName } from "@/components/Icon";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/job-board", label: "Job Board", icon: "board" },
  { href: "/job-board/cockpit", label: "WIP Cockpit", icon: "machines" },
];

/** Secondary navigation shared by the Job Board and its Cockpit sub-module. */
export function JobBoardTabs() {
  const pathname = usePathname();
  return (
    <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5">
      {TABS.map((t) => {
        const active =
          t.href === "/job-board"
            ? pathname === "/job-board"
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            onMouseEnter={() => prefetch("/api/work-orders", () => getJSON("/api/work-orders"))}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-ink-100 text-ink-900"
                : "text-ink-500 hover:text-ink-900"
            }`}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
