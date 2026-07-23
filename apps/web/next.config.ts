import type { NextConfig } from "next";

// Single-origin: the browser only ever talks to the web domain; the Next server
// reverse-proxies /api/v1/* to the API service. This removes the second
// .up.railway.app DNS lookup (which flaky mobile carriers fail to resolve → the
// "API call doesn't work" symptom) and eliminates cross-origin/CORS entirely.
// The destination is baked at build time, so API_PROXY_TARGET is a build ARG.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiProxyTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
