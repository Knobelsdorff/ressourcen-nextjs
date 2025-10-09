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
  }
};

export default nextConfig;
