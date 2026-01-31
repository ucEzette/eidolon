/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile wagmi/viem packages for SSR compatibility
  transpilePackages: [
    "@circle-fin/modular-wallets-core",
  ],
  // Disable static export optimization for pages with Web3 deps
  experimental: {
    // Ensure client components are properly handled
    serverComponentsExternalPackages: ["viem", "wagmi"],
  },
  // Suppress hydration warnings from web3 libs
  reactStrictMode: true,
  // Webpack config for polyfills and externals
  webpack: (config, { isServer }) => {
    // Fix for packages that have issues in SSR
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
