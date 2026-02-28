import type { Map, IControl } from 'maplibre-gl';
import type { StacItem } from './types';

interface CogLayerEntry {
  itemId: string;
  cogUrl: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoKeysParser = (geoKeys: Record<string, unknown>) => Promise<any>;

/**
 * Build a geoKeysParser using geotiff-geokeys-to-proj4.
 * This converts GeoTIFF geokeys directly to proj4 strings with correct
 * coordinatesUnits, avoiding the epsg.io PROJJSON ellipsoid lookup issues.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildGeoKeysParser(): Promise<GeoKeysParser | null> {
  try {
    const geokeysModule = await import('geotiff-geokeys-to-proj4');
    const geoKeysToProj4 = geokeysModule.default || geokeysModule;
    if (!geoKeysToProj4 || typeof geoKeysToProj4.toProj4 !== 'function') {
      return null;
    }

    const proj4Module = await import('proj4');
    const proj4Fn = proj4Module.default || proj4Module;

    return async (geoKeys: Record<string, unknown>) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = geoKeysToProj4.toProj4(geoKeys as any);
        if (result && result.proj4) {
          // Remove axis parameter which can cause issues with some projections
          let proj4Str = result.proj4 as string;
          proj4Str = proj4Str.replace(/\+axis=\w+\s*/g, '');

          let parsed: Record<string, unknown> = {};
          try {
            (proj4Fn as { defs: (key: string, def?: string) => unknown }).defs(
              'custom',
              proj4Str,
            );
            parsed =
              ((proj4Fn as { defs: (key: string) => unknown }).defs('custom') as Record<
                string,
                unknown
              >) || {};
          } catch {
            // proj4 parsing error - continue with empty parsed
          }

          return {
            def: proj4Str,
            parsed,
            coordinatesUnits: (result.coordinatesUnits as string) || 'metre',
          };
        }
      } catch {
        // geoKeysParser error
      }
      return null;
    };
  } catch {
    // geotiff-geokeys-to-proj4 not available
    return null;
  }
}

/**
 * Monkey-patch COGLayer._parseGeoTIFF to inject FilterNoDataVal into the
 * render pipeline. This makes nodata pixels transparent instead of black.
 * Reads _nodata from layer props (passed when creating COGLayer instances).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function patchCOGLayerForNodata(COGLayerClass: any): Promise<void> {
  if (COGLayerClass.__nodataPatched) return;
  COGLayerClass.__nodataPatched = true;

  const originalParseGeoTIFF = COGLayerClass.prototype._parseGeoTIFF;

  COGLayerClass.prototype._parseGeoTIFF = async function () {
    await originalParseGeoTIFF.call(this);

    // Inject nodata filtering via _nodata prop
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userNodata = (this as any).props._nodata;
    if (userNodata !== undefined && userNodata !== null && !isNaN(userNodata)) {
      const { FilterNoDataVal } = await import('@developmentseed/deck.gl-raster/gpu-modules');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const origRenderTile = (this as any).state.defaultRenderTile;
      if (typeof origRenderTile === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wrappedRenderTile = (tileData: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pipeline: any[] = origRenderTile(tileData);
          // Remove any existing FilterNoDataVal entries
          const filtered = pipeline.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (step: any) => step.module !== FilterNoDataVal,
          );
          // Insert FilterNoDataVal after CreateTexture (index 1)
          filtered.splice(1, 0, {
            module: FilterNoDataVal,
            props: { value: userNodata },
          });
          return filtered;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any).setState({ defaultRenderTile: wrappedRenderTile });
      }
    }
  };
}

export class CogLayer {
  private map: Map;
  private overlay: unknown | null = null;
  private activeLayers: CogLayerEntry[] = [];
  private initialized = false;
  private geoKeysParser: GeoKeysParser | null = null;
  private geoKeysParserReady: Promise<void>;

  constructor(map: Map) {
    this.map = map;
    this.geoKeysParserReady = buildGeoKeysParser().then((parser) => {
      this.geoKeysParser = parser;
    });
  }

  private async ensureOverlay(): Promise<void> {
    if (this.initialized) return;

    try {
      const { MapboxOverlay } = await import('@deck.gl/mapbox');
      this.overlay = new MapboxOverlay({
        interleaved: true,
        layers: [],
      });
      this.map.addControl(this.overlay as IControl);
      this.initialized = true;
    } catch (e) {
      throw new Error(
        'Failed to initialize deck.gl overlay. Ensure @deck.gl/mapbox and @developmentseed/deck.gl-geotiff are installed. ' +
          String(e),
      );
    }
  }

  private async createCogLayers(): Promise<unknown[]> {
    const { COGLayer } = await import('@developmentseed/deck.gl-geotiff');

    // Patch COGLayer for nodata masking (only patches once)
    await patchCOGLayerForNodata(COGLayer);

    // Wait for geoKeysParser to be ready
    await this.geoKeysParserReady;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.activeLayers.map((entry) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props: Record<string, any> = {
        id: `vantor-cog-${entry.itemId}`,
        geotiff: entry.cogUrl,
        _nodata: 0,
      };
      if (this.geoKeysParser) {
        props.geoKeysParser = this.geoKeysParser;
      }
      return new COGLayer(props);
    });
  }

  private async updateOverlay(): Promise<void> {
    if (!this.overlay) return;

    const layers = await this.createCogLayers();
    (this.overlay as { setProps: (props: { layers: unknown[] }) => void }).setProps({
      layers,
    });
  }

  async addCogLayer(item: StacItem): Promise<void> {
    const cogUrl = item.assets?.visual?.href;
    if (!cogUrl) {
      throw new Error(`No COG URL found for item ${item.id}`);
    }

    // Skip if already added
    if (this.activeLayers.some((l) => l.itemId === item.id)) return;

    await this.ensureOverlay();

    this.activeLayers.push({ itemId: item.id, cogUrl });
    await this.updateOverlay();
  }

  async removeCogLayer(itemId: string): Promise<void> {
    this.activeLayers = this.activeLayers.filter((l) => l.itemId !== itemId);
    await this.updateOverlay();
  }

  async removeAll(): Promise<void> {
    this.activeLayers = [];
    if (this.overlay) {
      (this.overlay as { setProps: (props: { layers: unknown[] }) => void }).setProps({
        layers: [],
      });
    }
  }

  getActiveLayerIds(): string[] {
    return this.activeLayers.map((l) => l.itemId);
  }

  remove(): void {
    if (this.overlay) {
      try {
        this.map.removeControl(this.overlay as IControl);
      } catch {
        // Ignore if already removed
      }
      this.overlay = null;
    }
    this.activeLayers = [];
    this.initialized = false;
  }
}
