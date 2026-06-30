import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname),
  base: process.env.BASE_PATH || '/',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    // maplibre-gl-raster's GeoTIFF/wasm decoders use top-level await, which the
    // default es2020 target rejects. Target a baseline that supports TLA.
    target: 'esnext',
  },
  optimizeDeps: {
    esbuildOptions: { target: 'esnext' },
  },
});
