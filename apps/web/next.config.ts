import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@cloudleak/core", "@cloudleak/db", "@cloudleak/aws"],
  // Baseline security headers on every response. A nonce-based CSP is left out
  // here — Next's inline runtime needs nonce wiring, a larger change; the
  // headers below are the high-value, low-risk subset.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  webpack: (cfg) => {
    // Our TS sources use explicit ".js" extensions in relative imports (correct for
    // Node ESM). Tell webpack a ".js" import may resolve to a ".ts"/".tsx" source.
    cfg.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return cfg;
  },
};

export default config;
