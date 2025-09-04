/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable Turbopack for faster development builds
    turbo: {},
  },
  images: {
    // Configure image domains for Supabase storage
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Enable type checking for faster builds
  typescript: {
    ignoreBuildErrors: false,
  },
  // Optimize bundle size
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

module.exports = nextConfig;