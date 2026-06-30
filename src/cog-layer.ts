import type { Map as MaplibreMap } from 'maplibre-gl';
import type { LayerManager } from 'maplibre-gl-raster';
import type { StacItem } from './types';

export type CogLayerEvent = 'layeradd' | 'layerremove';

export interface CogLayerEventDetail {
  layerId: string;
  url?: string;
  name?: string;
}

type CogLayerEventHandler = (detail: CogLayerEventDetail) => void;

interface CogLayerEntry {
  itemId: string;
  cogUrl: string;
  name: string;
  visible: boolean;
  opacity: number;
}

/**
 * Renders Vantor COGs on the map by delegating to maplibre-gl-raster's headless
 * {@link LayerManager} (a deck.gl GPU pipeline on a shared MapboxOverlay).
 *
 * maplibre-gl-raster reads GeoTIFFs with `@developmentseed/geotiff`, which
 * groups each RGB overview with its associated mask IFD and composites the mask
 * into the alpha channel. This both fixes the previous crash on COGs that carry
 * an internal GDAL mask ("Unexpected number of channels in raster data: 1",
 * caused by a mask IFD being mistaken for a 1-band overview) and renders nodata
 * regions transparently.
 *
 * maplibre-gl-raster and its deck.gl / luma.gl peers are optional and imported
 * lazily, so this module only pulls them in when a COG is actually visualized.
 */
export class CogLayer {
  private map: MaplibreMap;
  private manager: LayerManager | null = null;
  private managerPromise: Promise<LayerManager> | null = null;
  private activeLayers: CogLayerEntry[] = [];
  private eventHandlers: Map<CogLayerEvent, Set<CogLayerEventHandler>> = new Map();

  constructor(map: MaplibreMap) {
    this.map = map;
  }

  on(event: CogLayerEvent, handler: CogLayerEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: CogLayerEvent, handler: CogLayerEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: CogLayerEvent, detail: CogLayerEventDetail): void {
    this.eventHandlers.get(event)?.forEach((handler) => handler(detail));
  }

  private ensureManager(): Promise<LayerManager> {
    if (!this.managerPromise) {
      this.managerPromise = (async () => {
        try {
          const { LayerManager } = await import('maplibre-gl-raster');
          // maplibre-gl-raster's map type may come from a different maplibre-gl
          // version than the host app's; the surface we use is identical.
          const manager = new LayerManager(this.map as never, {
            interleaved: true,
          });
          this.manager = manager;
          return manager;
        } catch (e) {
          this.managerPromise = null;
          throw new Error(
            'Failed to initialize COG renderer. Ensure maplibre-gl-raster (and its ' +
              '@deck.gl/* and @luma.gl/* peers) are installed. ' +
              String(e),
          );
        }
      })();
    }
    return this.managerPromise;
  }

  async addCogLayer(item: StacItem): Promise<void> {
    const cogUrl = this.findCogUrl(item);
    if (!cogUrl) {
      throw new Error(`No COG URL found for item ${item.id}`);
    }

    // Skip if already added
    if (this.activeLayers.some((l) => l.itemId === item.id)) return;

    const manager = await this.ensureManager();

    const name = item.id;
    // Resolves once the GeoTIFF header has loaded; rejects on load failure.
    // nodata: 0 renders fill/border pixels (value 0) transparently instead of
    // black, matching the catalog's convention for background pixels.
    await manager.addRaster(cogUrl, {
      id: item.id,
      name,
      zoomTo: false,
      state: { nodata: 0 },
    });

    this.activeLayers.push({ itemId: item.id, cogUrl, name, visible: true, opacity: 1 });
    this.emit('layeradd', { layerId: item.id, url: cogUrl, name });
  }

  async removeCogLayer(itemId: string): Promise<void> {
    const existed = this.activeLayers.some((l) => l.itemId === itemId);
    this.activeLayers = this.activeLayers.filter((l) => l.itemId !== itemId);
    this.manager?.removeRaster(itemId);

    if (existed) {
      this.emit('layerremove', { layerId: itemId });
    }
  }

  async removeAll(): Promise<void> {
    const ids = this.activeLayers.map((l) => l.itemId);
    this.activeLayers = [];
    for (const id of ids) {
      this.manager?.removeRaster(id);
    }
    for (const id of ids) {
      this.emit('layerremove', { layerId: id });
    }
  }

  setLayerVisibility(layerId: string, visible: boolean): void {
    const entry = this.activeLayers.find((l) => l.itemId === layerId);
    if (!entry) return;
    entry.visible = visible;
    this.manager?.setVisible(layerId, visible);
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    const entry = this.activeLayers.find((l) => l.itemId === layerId);
    if (!entry) return;
    entry.opacity = Math.max(0, Math.min(1, opacity));
    this.manager?.setState(layerId, { opacity: entry.opacity });
  }

  getLayerEntry(layerId: string): { name: string; visible: boolean; opacity: number } | null {
    const entry = this.activeLayers.find((l) => l.itemId === layerId);
    if (!entry) return null;
    return { name: entry.name, visible: entry.visible, opacity: entry.opacity };
  }

  private findCogUrl(item: StacItem): string | null {
    const assets = item.assets || {};
    if (assets.visual) return assets.visual.href;
    for (const asset of Object.values(assets)) {
      const t = (asset.type || '').toLowerCase();
      if (t.includes('geotiff') || t.includes('tiff')) return asset.href;
    }
    return null;
  }

  getActiveLayerIds(): string[] {
    return this.activeLayers.map((l) => l.itemId);
  }

  remove(): void {
    const ids = this.activeLayers.map((l) => l.itemId);
    this.manager?.destroy();
    this.manager = null;
    this.managerPromise = null;
    this.activeLayers = [];
    for (const id of ids) {
      this.emit('layerremove', { layerId: id });
    }
  }
}
