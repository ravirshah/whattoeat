/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/whattoeat',
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
}

module.exports = nextConfig