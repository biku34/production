/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep demo builds unblocked; run `tsc` separately for strict checks.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
