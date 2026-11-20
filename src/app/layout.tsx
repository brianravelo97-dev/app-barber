import type { Metadata, Viewport } from "next";
import { Inter, Oswald, Playfair_Display } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { SITE_URL } from "@/lib/env";
import { getSettings } from "@/lib/data";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", weight: ["400", "500", "600", "700"], display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = s.tagline ? `${s.name} — ${s.tagline}` : s.name;
  const description =
    s.description?.replace(/\[.*?\]/g, "").trim().slice(0, 160) ||
    `Reserva tu hora online en ${s.name}. Cortes, fades, barba y afeitado tradicional.`;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${s.name}` },
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: s.locale.replace("-", "_"),
      siteName: s.name,
      images: s.hero_image_url ? [{ url: s.hero_image_url }] : undefined,
    },
    icons: s.logo_url ? { icon: s.logo_url } : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${oswald.variable} ${playfair.variable}`}>
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
