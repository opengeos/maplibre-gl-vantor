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
  // Adds a COG as a native, host-managed layer that appears in the host's
  // Layers panel (the host loads the GeoTIFF, manages projection/visibility,
  // and persists it). Preferred path for COG rendering in GeoLibre.
  addCogLayer?: (
    name: string,
    url: string,
    options?: { nodata?: number; opacity?: number },
  ) => Promise<string>;
  // Fallback: GeoLibre hands plugins its own maplibre-gl-raster so COGs render
  // on the host's single deck.gl/luma.gl instance instead of a bundled copy.
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
let themeObserver: MutationObserver | null = null;

/**
 * GeoLibre encodes light/dark mode as a `dark` class on <html> (see its
 * useThemeMode). Follow that instead of the OS `prefers-color-scheme` so the
 * panel matches the app theme.
 */
function hostTheme(): 'light' | 'dark' {
  return typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light';
}

function createControl(app: GeoLibreAppAPI): VantorControl {
  return new VantorControl({
    collapsed: true,
    panelWidth: 380,
    theme: hostTheme(),
    // Prefer the host's addCogLayer so COGs become native layers in the Layers
    // panel; fall back to the host's maplibre-gl-raster instance if absent.
    cogAdder: app.addCogLayer
      ? (name, url, options) => app.addCogLayer!(name, url, options)
      : undefined,
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
    // Keep the panel theme in sync with GeoLibre's light/dark toggle.
    if (!themeObserver && typeof MutationObserver !== 'undefined') {
      themeObserver = new MutationObserver(() => control?.setTheme(hostTheme()));
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  },
  deactivate(app) {
    themeObserver?.disconnect();
    themeObserver = null;
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
