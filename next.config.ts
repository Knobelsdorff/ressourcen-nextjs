import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@supabase/supabase-js'],
  // Ensure proper build output
  output: 'standalone',
  // Disable strict mode for production builds
  reactStrictMode: false,
  // Ensure proper image optimization
  images: {
    unoptimized: true
  },
  // Webhook-Route-Konfiguration für raw body
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Increased to support longer audio recordings (up to 10 minutes)
    },
  },
};

export default nextConfig;
