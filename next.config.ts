import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cố định workspace root về thư mục dự án (tránh nhầm với lockfile ở thư mục cha).
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Cho phép upload ảnh tới 5MB qua server action (mặc định Next là 1MB).
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
