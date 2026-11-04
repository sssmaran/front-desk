import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // bcryptjs and papaparse run only in API route handlers (Node runtime).
  serverExternalPackages: ["bcryptjs", "papaparse"],
};

export default nextConfig;
