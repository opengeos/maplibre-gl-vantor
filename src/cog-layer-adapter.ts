import type { CogLayer } from './cog-layer';

interface LayerState {
  visible: boolean;
  opacity: number;
  name: string;
}

interface CogLayerInfo {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
}

/**
 * Adapter that bridges VantorControl's CogLayer with maplibre-gl-layer-control's
 * CustomLayerAdapter interface. This makes COG raster layers appear in the layer control
 * with visibility toggle and opacity slider.
 */
export class CogLayerAdapter {
  readonly type = 'cog';

  private cogLayer: CogLayer;
  private layerInfoMap: Map<string, CogLayerInfo> = new Map();
  private changeCallbacks: Array<(event: 'add' | 'remove', layerId: string) => void> = [];

  constructor(cogLayer: CogLayer) {
    this.cogLayer = cogLayer;

    this.cogLayer.on('layeradd', (detail) => {
      this.layerInfoMap.set(detail.layerId, {
        id: detail.layerId,
        name: detail.name || detail.layerId,
        visible: true,
        opacity: 1,
      });
      this.changeCallbacks.forEach((cb) => cb('add', detail.layerId));
    });

    this.cogLayer.on('layerremove', (detail) => {
      this.layerInfoMap.delete(detail.layerId);
      this.changeCallbacks.forEach((cb) => cb('remove', detail.layerId));
    });

    this.syncFromCogLayer();
  }

  private syncFromCogLayer(): void {
    for (const layerId of this.cogLayer.getActiveLayerIds()) {
      if (this.layerInfoMap.has(layerId)) continue;

      const entry = this.cogLayer.getLayerEntry(layerId);
      if (!entry) continue;

      this.layerInfoMap.set(layerId, {
        id: layerId,
        name: entry.name,
        visible: entry.visible,
        opacity: entry.opacity,
      });
    }
  }

  getLayerIds(): string[] {
    return Array.from(this.layerInfoMap.keys());
  }

  getLayerState(layerId: string): LayerState | null {
    const info = this.layerInfoMap.get(layerId);
    if (!info) return null;
    return { visible: info.visible, opacity: info.opacity, name: info.name };
  }

  setVisibility(layerId: string, visible: boolean): void {
    const info = this.layerInfoMap.get(layerId);
    if (!info) return;
    info.visible = visible;
    this.cogLayer.setLayerVisibility(layerId, visible);
  }

  setOpacity(layerId: string, opacity: number): void {
    const info = this.layerInfoMap.get(layerId);
    if (!info) return;
    info.opacity = opacity;
    this.cogLayer.setLayerOpacity(layerId, opacity);
  }

  getName(layerId: string): string {
    return this.layerInfoMap.get(layerId)?.name ?? layerId;
  }

  getSymbolType(_layerId: string): string {
    return 'raster';
  }

  getNativeLayerIds(layerId: string): string[] {
    if (!this.layerInfoMap.has(layerId)) return [];
    return [`vantor-cog-${layerId}`];
  }

  removeLayer(layerId: string): void {
    void this.cogLayer.removeCogLayer(layerId);
  }

  onLayerChange(
    callback: (event: 'add' | 'remove', layerId: string) => void,
  ): () => void {
    this.changeCallbacks.push(callback);
    return () => {
      const idx = this.changeCallbacks.indexOf(callback);
      if (idx >= 0) this.changeCallbacks.splice(idx, 1);
    };
  }
}
