/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/whattoeat',
  trailingSlash: true,
  images: {
    domains: ['']
  },
  // If you're using a specific output directory
  // output: 'standalone',
}

module.exports = nextConfig
