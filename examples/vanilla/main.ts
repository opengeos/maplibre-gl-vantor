import maplibregl from 'maplibre-gl';
import { LayerControl } from 'maplibre-gl-layer-control';
import 'maplibre-gl-layer-control/style.css';
import { VantorControl, CogLayerAdapter } from '../../src/index';


const BASEMAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const map = new maplibregl.Map({
  container: 'map',
  style: BASEMAP_STYLE_URL,
  center: [46.0, -18.0],
  zoom: 5,
});

map.addControl(new maplibregl.NavigationControl(), 'top-left');

map.on('load', () => {
  // Add Google Satellite basemap
  map.addSource('google-satellite', {
    type: 'raster',
    tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
    tileSize: 256,
    attribution: '&copy; Google',
  });

  map.addLayer({
    id: 'google-satellite',
    type: 'raster',
    source: 'google-satellite',
    paint: {
      'raster-opacity': 1,
    },
    layout: {
      visibility: 'none',
    },
  });

  // Add layer control first; register the COG adapter after Vantor is mounted.
  const layerControl = new LayerControl({
    collapsed: true,
    basemapStyleUrl: BASEMAP_STYLE_URL,
    excludeDrawnLayers: true,
    excludeLayers: ['*Draw*', 'vantor-*'],
  });
  map.addControl(layerControl, 'top-right');

  const vantor = new VantorControl({
    position: 'top-right',
  });
  map.addControl(vantor);

  const cogLayer = vantor.getCogLayer();
  if (cogLayer) {
    layerControl.registerCustomAdapter(new CogLayerAdapter(cogLayer));
  }
});
