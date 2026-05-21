import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin workspace root so Vercel/local builds do not pick a parent lockfile directory.
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
