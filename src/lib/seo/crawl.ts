/**
 * robots.txt y sitemap.xml. Funciones puras para poder probarlas sin Next.
 *
 * El mismo Worker atiende chusquisimas.com y admin.chusquisimas.com: el panel
 * nunca debe indexarse, así que robots.txt depende del host.
 */
import { SITE_URL } from "../site.ts";

export const ADMIN_HOSTNAME = "admin.chusquisimas.com";

export function isAdminHost(host: string | null | undefined): boolean {
  return (host ?? "").toLowerCase().split(":")[0] === ADMIN_HOSTNAME;
}

export function buildRobotsTxt(host: string | null | undefined): string {
  if (isAdminHost(host)) {
    return ["User-agent: *", "Disallow: /", ""].join("\n");
  }
  return [
    "User-agent: *",
    "Allow: /",
    // Rutas de API: no son páginas. Las fotos públicas sí se rastrean desde las fichas.
    "Disallow: /api/",
    "Allow: /api/images/",
    "Disallow: /admin",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
}

export interface SitemapEntry {
  path: string;
  lastModified?: string;
  images?: string[];
}

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

export function buildSitemapXml(entries: readonly SitemapEntry[]): string {
  const body = entries.map((entry) => {
    const lines = [`  <url>`, `    <loc>${escapeXml(`${SITE_URL}${entry.path}`)}</loc>`];
    if (entry.lastModified) lines.push(`    <lastmod>${entry.lastModified}</lastmod>`);
    for (const image of entry.images ?? []) {
      lines.push(`    <image:image><image:loc>${escapeXml(`${SITE_URL}${image}`)}</image:loc></image:image>`);
    }
    lines.push(`  </url>`);
    return lines.join("\n");
  });
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...body,
    `</urlset>`,
    "",
  ].join("\n");
}
