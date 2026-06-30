import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig(({ command }) => ({
  plugins:
    command === 'build'
      ? [
          dts({
            include: ['src/**/*.ts', 'src/**/*.tsx'],
            exclude: ['src/**/*.test.ts', 'examples/**'],
            rollupTypes: true,
          }),
        ]
      : [],
  optimizeDeps: {
    // maplibre-gl-raster ships GeoTIFF/wasm decoders that use top-level await.
    // Raise the dep-optimizer target so esbuild still pre-bundles it (keeping
    // CJS interop for transitive deps) instead of rejecting TLA at es2020.
    esbuildOptions: { target: 'esnext' },
  },
  build: {
    lib: {
      entry: {
        'maplibre-gl-vantor': resolve(__dirname, 'src/index.ts'),
        'maplibre-gl-vantor-react': resolve(__dirname, 'src/react/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'maplibre-gl',
        'react',
        'react-dom',
        'react-map-gl',
        'react-map-gl/maplibre',
        'maplibre-gl-raster',
        'maplibre-gl-layer-control',
      ],
      output: {
        globals: {
          'maplibre-gl': 'maplibregl',
          react: 'React',
          'react-dom': 'ReactDOM',
          'maplibre-gl-raster': 'MaplibreGlRaster',
          'maplibre-gl-layer-control': 'MaplibreGlLayerControl',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'maplibre-gl-vantor.css';
          return assetInfo.name!;
        },
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
}));
