import { VantorControl } from './control';
import './styles.css';

// Minimal GeoLibre host contract (kept inline so the plugin entry has no extra
// dependencies). GeoLibre passes the live app API to the lifecycle hooks.
type GeoLibreMapControlPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

interface GeoLibreAppAPI {
  addMapControl: (
    control: VantorControl,
    position?: GeoLibreMapControlPosition,
  ) => boolean;
  removeMapControl: (control: VantorControl) => void;
  // GeoLibre hands plugins its own maplibre-gl-raster so COGs render on the
  // host's single deck.gl/luma.gl instance instead of a bundled second copy.
  getMaplibreGlRaster?: () => Promise<typeof import('maplibre-gl-raster')>;
  // Persisted projection preference; deck.gl COG tiles require mercator (globe
  // is unsupported). A raw map.setProjection is reverted by the host on idle.
  setMapProjection?: (projection: 'globe' | 'mercator') => void;
}

interface GeoLibrePlugin {
  id: string;
  name: string;
  version: string;
  activate: (app: GeoLibreAppAPI) => boolean | void;
  deactivate: (app: GeoLibreAppAPI) => void;
  getMapControlPosition?: () => GeoLibreMapControlPosition;
  setMapControlPosition?: (
    app: GeoLibreAppAPI,
    position: GeoLibreMapControlPosition,
  ) => boolean | void;
}

let control: VantorControl | null = null;
let position: GeoLibreMapControlPosition = 'top-left';

function createControl(app: GeoLibreAppAPI): VantorControl {
  return new VantorControl({
    collapsed: true,
    panelWidth: 380,
    theme: 'auto',
    // Render COGs through GeoLibre's bundled maplibre-gl-raster (single
    // deck.gl/luma.gl instance) when the host provides it.
    rasterLoader: app.getMaplibreGlRaster
      ? () => app.getMaplibreGlRaster!()
      : undefined,
  });
}

export const plugin: GeoLibrePlugin = {
  id: 'maplibre-gl-vantor',
  name: 'Vantor Open Data',
  version: '0.1.0',
  activate(app) {
    const isNew = !control;
    control = control ?? createControl(app);
    const added = app.addMapControl(control, position);
    if (!added) {
      control = null;
      return false;
    }
    // Adding a COG switches the host to mercator (deck.gl tiles don't support
    // globe). Setting the persisted preference makes it stick; a raw
    // map.setProjection is reverted on idle by the host.
    if (isNew && app.setMapProjection) {
      control.getCogLayer()?.on('layeradd', () => app.setMapProjection!('mercator'));
    }
  },
  deactivate(app) {
    if (!control) return;
    app.removeMapControl(control);
    control = null;
  },
  getMapControlPosition() {
    return position;
  },
  setMapControlPosition(app, nextPosition) {
    position = nextPosition;
    if (!control) return;

    app.removeMapControl(control);
    const added = app.addMapControl(control, position);
    if (!added) {
      control = null;
      return false;
    }
  },
};

export default plugin;
