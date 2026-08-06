import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../context/CartContext";
import { Toaster } from "react-hot-toast";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Chicken Delight | Fresh, Hot & Delicious Online Ordering",
  description:
    "Don't cook tonight, order online from Chicken Delight! Delicious fried chicken, combos, burgers, sides, and more delivered fresh to your door.",
  keywords:
    "chicken delight, online order, fast food delivery, takeout, fried chicken, burgers, meals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${outfit.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <CartProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#FFFFFF",
                color: "#1C1917",
                borderRadius: "12px",
                border: "1px solid #E7E5E4",
                fontSize: "13px",
                fontWeight: "600",
              },
              success: {
                iconTheme: {
                  primary: "#8a1538",
                  secondary: "#FFFFFF",
                },
              },
            }}
          />
        </CartProvider>
      </body>
    </html>
  );
}
