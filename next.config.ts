import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Docker imajı için yalnızca gerekli dosyaları içeren çıktı
  output: "standalone",
}

export default nextConfig
