import maplibregl from 'maplibre-gl';
import { VantorControl } from '../../src/index';

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  center: [46.0, -18.0],
  zoom: 5,
});

map.addControl(new maplibregl.NavigationControl(), 'top-left');

const vantor = new VantorControl({
  position: 'top-right',
});

map.addControl(vantor);
