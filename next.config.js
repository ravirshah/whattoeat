/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/whattoeat',
  trailingSlash: true,
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
  }
,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // This allows you to deploy with TypeScript errors
    ignoreBuildErrors: true,
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