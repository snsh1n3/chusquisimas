import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { OPEN_GRAPH_DEFAULTS, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const quicksand = Quicksand({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-quicksand",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Velas artesanales y wax melts`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { ...OPEN_GRAPH_DEFAULTS },
  twitter: { card: "summary" },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${quicksand.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}