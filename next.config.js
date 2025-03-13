/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/whattoeat',
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // This allows you to deploy with TypeScript errors
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig