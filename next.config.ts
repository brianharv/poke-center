import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["poke-center.test"],
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
