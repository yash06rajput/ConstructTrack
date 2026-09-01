import type { NextConfig } from "next";

/**
 * Allow next/image to optimize/serve images loaded from this project's
 * Supabase Storage instance (construction-site photos, delivered as
 * short-lived signed URLs — see lib/supabase/storage.ts). Derived from
 * NEXT_PUBLIC_SUPABASE_URL so no hostname needs to be hard-coded; if the
 * env var isn't set yet (e.g. before Supabase is configured), this simply
 * adds no remote pattern rather than failing the build.
 */
function supabaseImageRemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];

  try {
    const { hostname } = new URL(supabaseUrl);
    return [
      {
        protocol: "https",
        hostname,
        pathname: "/storage/v1/object/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseImageRemotePatterns(),
  },
  // pdfkit (lib/reports/pdf.ts, used only by the Node-runtime
  // GET /api/reports/[id]/pdf route) reads its bundled .afm font files
  // via dynamic fs calls that confuse webpack's static bundling analysis.
  // Keeping it external avoids that entirely — it's still just a normal
  // `require`d dependency at runtime.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
