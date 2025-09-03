import path from "node:path";
import type { NextConfig } from "next";

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

const nextConfig: NextConfig = {
  transpilePackages: ['recharts'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config) => {
    // Fix for recharts and react-is compatibility
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-is': require.resolve('react-is'),
    };
    return config;
  },
  experimental: {
    optimizePackageImports: ['recharts'],
  },
};

export default nextConfig;
// Orchids restart: 1756860267464