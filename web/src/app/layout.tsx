import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AirFare - Smart Flight Price Tracking",
  description:
    "Track flight prices, get alerts when prices drop, and never overpay for flights again.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "AirFare - Smart Flight Price Tracking",
    description:
      "Track flight prices, get alerts when prices drop, and never overpay for flights again.",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${geistMono.variable} antialiased`}>
        {/* Navigation — floating glass bar */}
        <nav className="fixed top-5 left-1/2 z-50 w-[92%] max-w-3xl -translate-x-1/2">
          <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <Image
                src="/app-icon.png"
                alt="AirFare"
                width={32}
                height={32}
                className="rounded-lg shadow-[0_0_12px_rgba(47,156,244,0.3)]"
              />
              <span className="text-[15px] font-extrabold tracking-tight text-white">
                AirFare
              </span>
            </Link>

            {/* Links */}
            <div className="flex items-center gap-1">
              <Link
                href="/#bento"
                className="rounded-xl px-4 py-2 text-[13px] font-medium text-[#94A3B8] transition-all hover:bg-white/[0.06] hover:text-white"
              >
                Features
              </Link>
              <Link
                href="mailto:boromask@gmail.com"
                className="rounded-xl px-4 py-2 text-[13px] font-medium text-[#94A3B8] transition-all hover:bg-white/[0.06] hover:text-white"
              >
                Contact
              </Link>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="min-h-screen">{children}</main>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] bg-[#060E1B]">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {/* Brand */}
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2.5">
                  <Image
                    src="/app-icon.png"
                    alt="AirFare"
                    width={36}
                    height={36}
                    className="rounded-xl"
                  />
                  <span className="text-lg font-extrabold tracking-tight text-white">
                    AirFare
                  </span>
                </div>
                <p className="mt-3 text-sm font-normal text-[#64748B]">
                  We check every date so you don&apos;t have to.
                </p>
              </div>

              {/* Legal */}
              <div>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.08em] text-[#64748B]">
                  Legal
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="/privacy-policy"
                      className="text-sm font-medium text-[#94A3B8] transition-colors hover:text-white"
                    >
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/terms-of-service"
                      className="text-sm font-medium text-[#94A3B8] transition-colors hover:text-white"
                    >
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/data-deletion"
                      className="text-sm font-medium text-[#94A3B8] transition-colors hover:text-white"
                    >
                      Data Deletion
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/acceptable-use"
                      className="text-sm font-medium text-[#94A3B8] transition-colors hover:text-white"
                    >
                      Acceptable Use
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.08em] text-[#64748B]">
                  Support
                </h3>
                <ul className="space-y-3">
                  <li>
                    <a
                      href="mailto:boromask@gmail.com"
                      className="text-sm font-medium text-[#94A3B8] transition-colors hover:text-white"
                    >
                      boromask@gmail.com
                    </a>
                  </li>
                </ul>
              </div>

              {/* Download */}
              <div>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.08em] text-[#64748B]">
                  Download
                </h3>
                <ul className="space-y-3">
                  <li>
                    <span className="text-sm font-medium text-[#334155]">
                      App Store — Coming Soon
                    </span>
                  </li>
                  <li>
                    <span className="text-sm font-medium text-[#334155]">
                      Google Play — Coming Soon
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 border-t border-white/[0.04] pt-6 text-center text-xs font-medium text-[#334155]">
              &copy; {new Date().getFullYear()} AirFare. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
