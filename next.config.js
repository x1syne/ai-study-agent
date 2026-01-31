/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
  },
  // Enable instrumentation for startup validation
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig
