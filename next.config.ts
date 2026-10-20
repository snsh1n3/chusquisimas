import type { NextConfig } from "next";
import path from "node:path";
import { securityHeaderRules } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.2"],
  poweredByHeader: false,
  // React Compiler: memoriza componentes y valores en tiempo de compilación,
  // sin useMemo/useCallback manuales. Requiere babel-plugin-react-compiler.
  reactCompiler: true,
  experimental: {
    // Incrusta el CSS (Tailwind, ~7 KiB) en el HTML: quita la petición que bloquea
    // el primer render (Lighthouse 19-oct-2026: 740–960 ms de espera del LCP).
    // Solo aplica en build de producción. La CSP ya permite estilos inline.
    inlineCss: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return securityHeaderRules();
  },
};

export default nextConfig;

// Enable calling getCloudflareContext() in next dev.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
