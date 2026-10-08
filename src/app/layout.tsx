import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-quicksand",
});

export const metadata: Metadata = {
  title: {
    default: "Chusquisimas | Crea ambiente, enciende tu chusquisima",
    template: "%s | Chusquisimas",
  },
  description:
    "Velas aromaticas, wax melts y detalles artesanales para llenar tus espacios de personalidad.",
  applicationName: "Chusquisimas",
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