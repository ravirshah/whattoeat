/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use environment variables for base path configuration
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // Enable strict mode for better development
  reactStrictMode: true,

  // Optimize image loading with domains you might use
  images: {
    domains: ['placeholder.com', 'via.placeholder.com'],
  },

  // Add async headers to improve security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // Custom webpack configuration if needed
  webpack: (config, { isServer }) => {
    // Any custom webpack config goes here
    return config;
  },

  // ESLint settings
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript settings
  typescript: {
    // This allows you to deploy with TypeScript errors
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
