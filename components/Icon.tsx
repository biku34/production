import type { SVGProps } from "react";

export type IconName =
  | "dashboard"
  | "board"
  | "workorders"
  | "machines"
  | "reports"
  | "trace"
  | "masters"
  | "plus"
  | "chevronRight"
  | "arrowRight"
  | "close"
  | "more"
  | "refresh"
  | "warning"
  | "check"
  | "eye"
  | "spool";

const PATHS: Record<IconName, React.ReactNode> = {
  // layout / dashboard
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.2" />
      <rect x="14" y="3" width="7" height="5" rx="1.2" />
      <rect x="14" y="12" width="7" height="9" rx="1.2" />
      <rect x="3" y="16" width="7" height="5" rx="1.2" />
    </>
  ),
  // kanban board
  board: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.2" />
      <rect x="9.5" y="4" width="5" height="11" rx="1.2" />
      <rect x="16" y="4" width="5" height="13" rx="1.2" />
    </>
  ),
  // clipboard / work orders
  workorders: (
    <>
      <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" />
      <path d="M8 6H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </>
  ),
  // machine / cog
  machines: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  // bar chart
  reports: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <rect x="7" y="11" width="3" height="6" rx="0.6" />
      <rect x="12" y="7" width="3" height="10" rx="0.6" />
      <rect x="17" y="13" width="3" height="4" rx="0.6" />
    </>
  ),
  // search / trace
  trace: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  // sliders / masters
  masters: (
    <>
      <path d="M4 7h11M19 7h1M4 12h4M12 12h8M4 17h9M17 17h3" />
      <circle cx="17" cy="7" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="15" cy="17" r="2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4.5 21 19.5H3L12 4.5Z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  // brand mark: thread spool
  spool: (
    <>
      <path d="M7 4h10M7 20h10" />
      <path d="M8.5 4v16M15.5 4v16" />
      <path d="M8.5 9h7M8.5 12h7M8.5 15h7" />
    </>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

export default Icon;
