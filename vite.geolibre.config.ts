import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Build the GeoLibre plugin bundle: a single self-contained ES module entry
// (dist/index.js) plus dist/style.css. GeoLibre's external plugin loader does
// not resolve sibling chunks, so everything (VantorControl + maplibre-gl-raster
// + deck.gl + GeoTIFF decoders) is inlined into one file.
export default defineConfig({
  worker: { format: 'es' },
  resolve: {
    alias: {
      // GeoLibre provides maplibre-gl-raster (and thus deck.gl/luma.gl) to the
      // plugin at runtime via app.getMaplibreGlRaster(). Stub the package in the
      // bundle so a second deck.gl/luma.gl is never shipped (luma.gl throws
      // "already initialized" on a duplicate). This also drops cog-tiler-wasm,
      // which was only reachable through maplibre-gl-raster.
      'maplibre-gl-raster': resolve(
        __dirname,
        'src/geolibre-stubs/maplibre-gl-raster.ts',
      ),
    },
  },
  // Vite library mode does not replace process.env.NODE_ENV (an app-build
  // feature), so dependencies that branch on it would throw "process is not
  // defined" in the browser. Replace it at build time.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    // maplibre-gl-raster's GeoTIFF/WASM decoders use top-level await.
    target: 'esnext',
    lib: {
      entry: resolve(__dirname, 'src/geolibre.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    outDir: 'geolibre-plugin/dist',
    emptyOutDir: true,
    rollupOptions: {
      // Bundle everything; the host only provides the map, not plugin deps.
      external: [],
      output: {
        assetFileNames: () => 'style.css',
        inlineDynamicImports: true,
        // Minimal `process` shim for deps that read Node globals (argv,
        // version, browser, ...) without a typeof guard, so the self-contained
        // bundle runs in the browser.
        banner:
          'globalThis.process=globalThis.process||{env:{NODE_ENV:"production"},argv:[],version:"",versions:{},browser:true,platform:"browser",hrtime:()=>[0,0],nextTick:(f)=>setTimeout(f,0)};',
      },
    },
    cssCodeSplit: false,
    sourcemap: false,
    minify: false,
  },
});
