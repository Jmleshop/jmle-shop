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

/**
 * NEXT_PUBLIC_* landet im Browser-Bundle. Geheime Supabase-Schlüssel dort
 * würden öffentlich — Build sofort abbrechen.
 */
function assertNoSecretInPublicEnv() {
  for (const [name, value] of Object.entries(process.env)) {
    if (!name.startsWith("NEXT_PUBLIC_") || !value) continue;
    const v = value.trim();
    let serviceRoleJwt = false;
    if (v.startsWith("eyJ")) {
      try {
        const payload = JSON.parse(
          Buffer.from(v.split(".")[1] ?? "", "base64url").toString("utf8")
        ) as { role?: string };
        serviceRoleJwt = payload.role === "service_role";
      } catch {
        /* kein JWT */
      }
    }
    if (v.startsWith("sb_secret_") || serviceRoleJwt) {
      throw new Error(
        `${name} enthält einen GEHEIMEN Supabase-Schlüssel. Dort gehört der öffentliche (publishable/anon) Schlüssel hin.`
      );
    }
  }
}
assertNoSecretInPublicEnv();

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
    // Delivery: AVIF/WebP at shop quality; cap srcset widths to limit Supabase egress
    formats: ["image/avif", "image/webp"],
    // 85 nur für Banner; große Breiten nur für Banner (Produktbilder bleiben ≤ 384/640)
    qualities: [75, 85],
    deviceSizes: [640, 750, 828, 1080, 1440, 1920, 2560],
    imageSizes: [64, 96, 128, 256, 384],
    // Keep optimized derivatives on the CDN for a year (browser + Vercel)
    minimumCacheTTL: 60 * 60 * 24 * 365,
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
  async headers() {
    const immutableYear =
      "public, max-age=31536000, immutable, stale-while-revalidate=86400";
    return [
      {
        source: "/_next/image",
        headers: [{ key: "Cache-Control", value: immutableYear }],
      },
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: immutableYear }],
      },
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2)",
        headers: [{ key: "Cache-Control", value: immutableYear }],
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
