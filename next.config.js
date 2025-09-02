/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    allowedDevOrigins: [
      'https://*.cloudworkstations.dev',
      'https://*.firebase.studio',
    ],
  },
  transpilePackages: ['zod'],
  reactStrictMode: true,
  typescript: {
    // Set to false to ignore build errors.
    ignoreBuildErrors: false,
  },
  eslint: {
    // Set to false to ignore linting errors during build.
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https'
        hostname: 'i.postimg.cc',
        port: '',
        pathname: '/**',
      },
    ],
  },
};
// Cache invalidation comment: 1756643762000
module.exports = nextConfig;