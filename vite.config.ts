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
        '@deck.gl/core',
        '@deck.gl/mapbox',
        '@developmentseed/deck.gl-geotiff',
        '@developmentseed/deck.gl-raster/gpu-modules',
        'geotiff',
        'geotiff-geokeys-to-proj4',
        'proj4',
      ],
      output: {
        globals: {
          'maplibre-gl': 'maplibregl',
          react: 'React',
          'react-dom': 'ReactDOM',
          '@deck.gl/core': 'deck',
          '@deck.gl/mapbox': 'DeckMapbox',
          '@developmentseed/deck.gl-geotiff': 'DeckGLGeotiff',
          '@developmentseed/deck.gl-raster/gpu-modules': 'DeckGLRasterGpuModules',
          geotiff: 'GeoTIFF',
          'geotiff-geokeys-to-proj4': 'geotiffGeokeysToProj4',
          proj4: 'proj4',
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
