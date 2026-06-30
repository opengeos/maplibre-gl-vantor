// In the GeoLibre build, COG rendering uses the *host's* maplibre-gl-raster
// (obtained via `app.getMaplibreGlRaster()`), so the plugin bundle must not
// include its own copy — a bundled deck.gl/luma.gl is a second instance and
// luma.gl throws "already initialized". This stub replaces the package in the
// geolibre bundle so deck.gl/luma.gl are never bundled. It is only reached if a
// host failed to provide the module, in which case construction throws clearly.
export class LayerManager {
  constructor() {
    throw new Error(
      'maplibre-gl-raster is not bundled in the Vantor Open Data GeoLibre ' +
        'plugin; the host must provide it via app.getMaplibreGlRaster().',
    );
  }
}

export const DEFAULT_ENGINE = 'maplibre-gl-raster';
