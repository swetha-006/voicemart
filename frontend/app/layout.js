import { Orbitron, Rajdhani } from "next/font/google";

import ClientShell from "@/components/ui/ClientShell";

import "@/styles/globals.css";


const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--font-rajdhani",
  weight: ["400", "500", "600", "700"],
});


export const metadata = {
  title: "VoiceMart",
  description: "Voice-enabled e-commerce platform designed for accessible shopping.",
};


export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${orbitron.variable} ${rajdhani.variable}`}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
