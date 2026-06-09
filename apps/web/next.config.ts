import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@cloudleak/core", "@cloudleak/db", "@cloudleak/aws"],
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
