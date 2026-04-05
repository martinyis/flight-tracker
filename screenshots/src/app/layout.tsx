import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata = {
  title: "Airfare — App Store Screenshots",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body style={{ fontFamily: "var(--font-outfit), sans-serif", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
