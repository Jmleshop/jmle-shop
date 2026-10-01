import type { NextConfig } from "next";

function supabaseHostname(): string {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (url) return new URL(url).hostname;
  } catch {
    /* ignore */
  }
  return "rbdarbzwbzpfjorgeavi.supabase.co";
}

const nextConfig: NextConfig = {
  // ONNX/WASM des Freistellers bleibt aus dem Server-Bundle; der Editor lädt es nur im Browser.
  serverExternalPackages: [
    "@imgly/background-removal",
    "@imgly/background-removal-node",
    "onnxruntime-web",
    "onnxruntime-node",
    "sharp",
  ],
  images: {
    // Delivery: AVIF/WebP at shop quality; cap srcset widths to limit egress
    formats: ["image/avif", "image/webp"],
    qualities: [75, 80],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: supabaseHostname(),
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        module: false,
      };
    }
    return config;
  },
};

export default nextConfig;
