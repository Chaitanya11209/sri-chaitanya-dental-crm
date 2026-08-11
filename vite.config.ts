import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { generateZIP } from "./scripts/pack-project.js";

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'project-zip-exporter',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const rawUrl = req.url || '';
          const cleanedPath = rawUrl.split('?')[0];
          
          let zipType = '';
          let downloadFilename = '';

          if (cleanedPath === '/project-export.zip' || cleanedPath.endsWith('/project-export.zip')) {
            zipType = 'all';
            downloadFilename = 'project-export.zip';
          } else if (cleanedPath === '/sri-chaitanya-dental-crm-source.zip' || cleanedPath.endsWith('/sri-chaitanya-dental-crm-source.zip')) {
            zipType = 'source';
            downloadFilename = 'sri-chaitanya-dental-crm-source.zip';
          } else if (cleanedPath === '/sri-chaitanya-dental-crm-database.zip' || cleanedPath.endsWith('/sri-chaitanya-dental-crm-database.zip')) {
            zipType = 'database';
            downloadFilename = 'sri-chaitanya-dental-crm-database.zip';
          } else if (cleanedPath === '/sri-chaitanya-dental-crm-production-package.zip' || cleanedPath.endsWith('/sri-chaitanya-dental-crm-production-package.zip')) {
            zipType = 'production';
            downloadFilename = 'sri-chaitanya-dental-crm-production-package.zip';
          } else if (cleanedPath === '/Sri-Chaitanya-Dental-CRM-Full-Repository.zip' || cleanedPath.endsWith('/Sri-Chaitanya-Dental-CRM-Full-Repository.zip')) {
            zipType = 'master';
            downloadFilename = 'Sri-Chaitanya-Dental-CRM-Full-Repository.zip';
          }

          if (zipType !== '') {
            try {
              console.log(`[ZIP REQ] Dynamic ZIP generation requested via path "${cleanedPath}" for type "${zipType}"...`);
              const zipBuffer = await generateZIP(zipType);
              res.setHeader('Content-Type', 'application/zip');
              res.setHeader('Content-Disposition', `attachment; filename=${downloadFilename}`);
              res.end(zipBuffer);
              return;
            } catch (error) {
              console.error('[ZIP API] Error generating on-demand ZIP:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to generate ZIP archive' }));
              return;
            }
          }
          next();
        });
      }
    },
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) => m.default()),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({ root: path.resolve(import.meta.dirname, "..") })
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      [
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        'https://vgwxppbzfjgpvckvguge.supabase.co'
      ].find(val => {
        if (!val) return false;
        const l = val.toLowerCase();
        return !(l.includes('xxxxxxxxxxxxxxxxxxxx') || l.includes('placeholder') || l.includes('your-'));
      }) || 'https://vgwxppbzfjgpvckvguge.supabase.co'
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      [
        process.env.VITE_SUPABASE_ANON_KEY,
        process.env.SUPABASE_ANON_KEY,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        process.env.SUPABASE_PUBLISHABLE_KEY,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        'sb_publishable_rvfL3L-BWrEev3a1JB_B6Q_htkyuX41'
      ].find(val => {
        if (!val) return false;
        const l = val.toLowerCase();
        return !(l.includes('xxxxxxxxxxxxxxxxxxxx') || l.includes('placeholder') || l.includes('your-'));
      }) || 'sb_publishable_rvfL3L-BWrEev3a1JB_B6Q_htkyuX41'
    ),
    'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(
      process.env.GOOGLE_MAPS_PLATFORM_KEY ||
      process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      ''
    ),
    'import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(
      process.env.GOOGLE_MAPS_PLATFORM_KEY ||
      process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      ''
    ),
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: false,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
