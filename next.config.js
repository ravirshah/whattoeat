/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/whattoeat',
  trailingSlash: true,
  eslint: {
    // Warning: This allows you to deploy with ESLint errors
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig