import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["antd", "@ant-design/icons", "@ant-design/nextjs-registry", "frappe-gantt", "chart.js"],
  serverExternalPackages: ["pdfkit", "exceljs"],
};

export default nextConfig;
