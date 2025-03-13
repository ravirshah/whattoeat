/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/whattoeat', // Replace with your actual subdirectory
  async rewrites() {
    return [
      {
        source: '/generate-recipes', // What the app requests
        destination: '/api/generate-recipes', // Where it should go
      },
    ]
  }
};

module.exports = nextConfig;