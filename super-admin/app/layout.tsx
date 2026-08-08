import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pizza Hut RMS Admin",
  description: "Pizza Hut restaurant management admin portal",
};

import AdminLayout from "./components/AdminLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <AdminLayout>{children}</AdminLayout>
      </body>
    </html>
  );
}
