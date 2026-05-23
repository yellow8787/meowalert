import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        // Google 使用者頭像 (OAuth 登入後取得)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // Supabase Storage (未來上傳的照片)
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
