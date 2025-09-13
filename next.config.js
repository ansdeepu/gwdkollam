
/** @type {import('next').NextConfig} */
const nextConfig = {
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
        protocol: 'https',
        hostname: 'i.postimg.cc',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // This allows the Next.js dev server to accept requests from the
    // Firebase Studio development environment.
  },
  allowedDevOrigins: [
      "*.google.com",
      "*.cloud.google.com",
      "*.firebase.google.com",
      "*.cloud.goog",
      "*.corp.google.com",
  ],
};

module.exports = nextConfig;
