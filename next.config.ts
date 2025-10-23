import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ❗ Eslint hatalarını build sırasında yoksay
  },
};

export default nextConfig;
