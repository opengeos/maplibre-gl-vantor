import { useEffect, useRef } from 'react';
import { VantorControl as VantorControlClass } from '../control';
import type { VantorControlOptions } from '../types';
import type { Map } from 'maplibre-gl';

export interface VantorControlProps extends VantorControlOptions {
  map?: Map;
}

export function VantorControl({ map, ...options }: VantorControlProps) {
  const controlRef = useRef<VantorControlClass | null>(null);
  const mapRef = useRef<Map | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!map) return;
    mapRef.current = map;

    const control = new VantorControlClass(optionsRef.current);
    controlRef.current = control;
    map.addControl(control, optionsRef.current.position || 'top-right');

    return () => {
      if (mapRef.current && controlRef.current) {
        try {
          mapRef.current.removeControl(controlRef.current);
        } catch {
          // Ignore if map already removed
        }
      }
      controlRef.current = null;
    };
  }, [map]);

  // Keep the panel theme in sync when the prop changes (e.g. host dark-mode toggle)
  useEffect(() => {
    if (options.theme) controlRef.current?.setTheme(options.theme);
  }, [options.theme]);

  return null;
}
