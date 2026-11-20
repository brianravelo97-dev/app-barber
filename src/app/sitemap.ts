import type { MetadataRoute } from "next";
import { getBarbers } from "@/lib/data";
import { SITE_URL } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const barbers = await getBarbers();
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, priority: 1 },
    { url: `${SITE_URL}/reservar`, lastModified: now, priority: 0.9 },
    { url: `${SITE_URL}/servicios`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/barberos`, lastModified: now, priority: 0.7 },
    ...barbers.map((b) => ({ url: `${SITE_URL}/barberos/${b.slug}`, lastModified: now, priority: 0.6 })),
  ];
}
