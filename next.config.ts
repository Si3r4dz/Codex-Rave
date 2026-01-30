import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfkit', 'fontkit', 'png-js', 'brotli'],
};

export default nextConfig;