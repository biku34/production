/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow an isolated build dir (defaults to .next) so a separate `next build`
  // can run without colliding with a running dev server's .next.
  distDir: process.env.FP_DISTDIR || ".next",
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep demo builds unblocked; run `tsc` separately for strict checks.
    ignoreBuildErrors: false,
  },
  // Keep already-fetched route data on the client router so re-navigating
  // between modules is instant (no repeat server/DB round-trip within the
  // window). Prefetch still warms them ahead of the click.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
