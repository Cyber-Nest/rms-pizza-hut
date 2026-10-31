import type { Metadata } from "next";
import "./globals.css";
import ToastProvider from "@/modules/employee-pos/components/ToastProvider";

export const metadata: Metadata = {
  title: "Pizza Hut POS | Employee Terminal",
  description: "Production-level Restaurant Employee Point of Sale System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased font-sans"
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
