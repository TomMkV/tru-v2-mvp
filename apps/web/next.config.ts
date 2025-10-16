import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Disable X-Powered-By header
  poweredByHeader: false,
  
  // Strict mode for better error detection
  reactStrictMode: true,
  
  // Optimize images (if needed in future)
  images: {
    unoptimized: true, // For now, disable optimization
  },
};

export default nextConfig;
