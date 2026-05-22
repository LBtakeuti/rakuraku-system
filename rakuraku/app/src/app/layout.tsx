import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "らくらく受発注システム",
  description: "トン屋（問屋）向けの受発注管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
