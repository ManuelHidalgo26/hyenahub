/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Vercel's bundler to treat these as external — they use native bindings
  // that don't inline cleanly into the serverless bundle.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],

  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  },
};

module.exports = nextConfig;
