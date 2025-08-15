/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin']
  },
  webpack: (config, { isServer, dev }) => {
    if (isServer && !dev) {
      // Build zamanında Firebase Admin'i exclude et
      config.externals = config.externals || [];
      config.externals.push('firebase-admin');
    }
    return config;
  }
};

module.exports = nextConfig;