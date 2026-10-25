import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  serverExternalPackages: ['@supabase/supabase-js', 'ffmpeg-static'],
  outputFileTracingIncludes: {
    '/api/audio/migrate-on-demand': ['./node_modules/ffmpeg-static/ffmpeg'],
    '/api/admin/audio/migrate-formats': ['./node_modules/ffmpeg-static/ffmpeg'],
  },
  // Ensure proper build output
  output: 'standalone',
  // Disable strict mode for production builds
  reactStrictMode: false,
  // Ensure proper image optimization
  images: {
    unoptimized: true
  },
  // PostHog über die eigene Domain (EU-Cloud). Reihenfolge wichtig: static und
  // array vor dem Rest. PostHog-Pfade enden auf "/", deshalb keine automatische
  // Slash-Weiterleitung – die übernimmt src/middleware.ts für alle anderen Seiten.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://eu-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/array/:path*', destination: 'https://eu-assets.i.posthog.com/array/:path*' },
      { source: '/ingest/:path*', destination: 'https://eu.i.posthog.com/:path*' },
    ];
  },
  // Webhook-Route-Konfiguration für raw body
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Increased to support longer audio recordings (up to 10 minutes)
    },
  },
};

export default nextConfig;
