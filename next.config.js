/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/whattoeat',
  trailingSlash: true,
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    // Allow production builds to successfully complete even if there are ESLint warnings
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow deployment with TypeScript warnings (but not errors)
    ignoreBuildErrors: false,
  },
  // Optimize for Vercel deployment
  experimental: {
    // Enable modern bundling optimizations
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  async rewrites() {
    return [
      {
        source: '/whattoeat/generate-recipes',
        destination: '/whattoeat/api/generate-recipes',
      },
    ];
  },
}

module.exports = nextConfig