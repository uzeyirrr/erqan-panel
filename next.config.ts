import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Docker imajı için yalnızca gerekli dosyaları içeren çıktı
  output: "standalone",
  experimental: {
    // Simge kütüphanesinden yalnızca kullanılan simgeler pakete girer.
    optimizePackageImports: ["@phosphor-icons/react"],
  },
}

export default nextConfig
