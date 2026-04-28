import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // reactStrictMode is intentionally disabled: React Strict Mode's double-invoke
  // of effects in development would mask the race-condition bug in the example
  // form. Candidates may enable it for their own code.
  reactStrictMode: false,

  // Mongoose/MongoDB must run as Node externals — bundling them breaks dev with
  // missing vendor chunks (e.g. Cannot find module './vendor-chunks/mongodb@*.js').
  serverExternalPackages: ['mongoose', 'mongodb', 'mongodb-memory-server'],

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  // Include @mui/material-nextjs so App Router + Emotion cache resolves correctly under Webpack.
  transpilePackages: ['@mui/material', '@mui/system', '@mui/material-nextjs'],
};

export default nextConfig;
