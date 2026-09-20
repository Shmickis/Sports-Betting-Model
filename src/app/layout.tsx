import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { getSettings } from "@/lib/queries";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TrueLine Command Center",
  description:
    "Analytical decision-support for disciplined sports betting — ledger, edge watch, CLV, and model research.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = getSettings();
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        <AppShell dataMode={settings.dataMode}>{children}</AppShell>
      </body>
    </html>
  );
}
