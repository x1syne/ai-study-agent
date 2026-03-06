/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
  },
  // Enable instrumentation for startup validation
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    // Exclude undici from webpack processing to avoid private field syntax errors
    if (isServer) {
      config.externals = [...(config.externals || []), 'undici']
    }
    return config
  },
}

module.exports = nextConfig
