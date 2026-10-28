import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
    reactStrictMode: true,
    // Prevent Next from picking up unrelated lockfiles higher in the filesystem
    outputFileTracingRoot: path.resolve(__dirname),
    devIndicators: false,
}

export default nextConfig
