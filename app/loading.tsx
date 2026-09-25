import { PageSkeleton } from "@/components/Skeleton";

// Shown instantly on navigation to any route (that lacks a closer loading.tsx)
// while the dynamic server render / DB query resolves.
export default function Loading() {
  return <PageSkeleton />;
}
