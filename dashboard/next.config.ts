import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nota: Next.js 15+ tiene un límite interno de ~10MB para API Routes
  // Solución: Subir archivos directamente a Supabase Storage desde el cliente
  // Ver: lib/supabase-storage.ts
};

export default nextConfig;
