import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/app-shell";

// Font chữ chính — Be Vietnam Pro hỗ trợ tiếng Việt tốt.
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "vietnamese"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Content Creator",
    template: "%s · Content Creator",
  },
  description: "Sinh nội dung + quản lý lịch đăng cho thương hiệu của bạn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
