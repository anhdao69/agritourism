/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  // typescript: { ignoreBuildErrors: true }, // <-- only if needed later
};
module.exports = nextConfig;
