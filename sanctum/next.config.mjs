/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile wagmi/viem packages for SSR compatibility
  transpilePackages: [
    "@circle-fin/modular-wallets-core",
    "@walletconnect/ethereum-provider",
    "@reown/appkit",
    "@wagmi/connectors",
    "wagmi",
  ],
  // Disable static export optimization for pages with Web3 deps
  experimental: {
    // Ensure client components are properly handled
    serverComponentsExternalPackages: [],
    esmExternals: "loose",
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
        crypto: false,
      };
    }

    // Alias react-native dependencies to empty
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native$': false,
      'react-native-web$': false,
      '@react-native-async-storage/async-storage$': false,
    };

    return config;
  },
};

export default nextConfig;
