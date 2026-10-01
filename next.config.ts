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

/** Never ship local ONNX/WASM runtimes / unused sharp platforms into Vercel bundles. */
const HEAVY_TRACE_EXCLUDES = [
  "node_modules/@imgly/background-removal-node/**",
  "node_modules/@imgly/background-removal/**",
  "node_modules/onnxruntime-node/**",
  "node_modules/onnxruntime-web/**",
  "node_modules/onnxruntime-common/**",
  "**/*.onnx",
  "**/*.wasm",
  // Vercel = linux glibc x64 — drop other sharp platform binaries (~20MB each)
  "node_modules/@img/sharp-libvips-linuxmusl-x64/**",
  "node_modules/@img/sharp-linuxmusl-x64/**",
  "node_modules/@img/sharp-wasm32/**",
  "node_modules/@img/sharp-darwin-*/**",
  "node_modules/@img/sharp-win32-*/**",
  "node_modules/@img/sharp-libvips-darwin-*/**",
  "node_modules/@swc/core*/**",
  "node_modules/webpack/**",
  "node_modules/terser/**",
];

const nextConfig: NextConfig = {
  // Client Freisteller lädt Modelle von CDN; Server nutzt HF API.
  serverExternalPackages: [
    "@imgly/background-removal",
    "onnxruntime-web",
    "sharp",
  ],
  // Hard exclude: even dynamic imports must not inflate Functions Storage
  outputFileTracingExcludes: {
    "*": HEAVY_TRACE_EXCLUDES,
  },
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
    // Never resolve the Node ONNX package into any bundle
    config.resolve.alias = {
      ...config.resolve.alias,
      "@imgly/background-removal-node": false,
      "onnxruntime-node": false,
    };
    return config;
  },
};

export default nextConfig;
