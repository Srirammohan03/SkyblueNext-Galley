// app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import QueryProvider from "./(dashboard)/query-provider";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkyBlue Galley",
  description: "Advanced In-flight Catering Management",

  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="developer"
          content="Sriram Mohan && Nithish && FouziaSumbul"
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
