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
  async redirects() {
    return [
      { source: "/legal/impressum", destination: "/impressum", permanent: true },
      { source: "/legal/datenschutz", destination: "/datenschutz", permanent: true },
      { source: "/legal/widerruf", destination: "/agb", permanent: true },
    ];
  },
  // ONNX/WASM des Freistellers bleibt aus dem Server-Bundle; der Editor lädt es nur im Browser.
  serverExternalPackages: ["@imgly/background-removal", "onnxruntime-web", "onnxruntime-node", "sharp"],
  images: {
    formats: ["image/webp"],
    qualities: [75, 85, 90],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [128, 256, 384, 512],
    minimumCacheTTL: 31536000,
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
    ],
  },
  async headers() {
    return [
      {
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
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
