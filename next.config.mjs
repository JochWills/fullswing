/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    // Reuse recently visited pages for back/forward and repeat clicks instead of re-rendering them.
    // Server actions (admin saves) clear this cache, and live data (slots, payments) is re-checked server-side.
    staleTimes: { dynamic: 30, static: 180 },
  },
};
export default nextConfig;
