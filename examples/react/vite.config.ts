import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // maplibre-gl-raster's GeoTIFF/wasm decoders use top-level await, which the
    // default es2020 target rejects. Target a baseline that supports TLA.
    target: 'esnext',
  },
  optimizeDeps: {
    esbuildOptions: { target: 'esnext' },
  },
});
