import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["poke-center.test"],
  logging: { incomingRequests: { ignore: [/\/api\/auth\/verify-email/] } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
