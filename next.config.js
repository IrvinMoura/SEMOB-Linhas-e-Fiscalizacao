/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-1d1d71c074fe4c8ab3bd9a17e0bd1aa0.r2.dev',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
