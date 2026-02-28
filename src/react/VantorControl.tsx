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

  useEffect(() => {
    if (!map) return;
    mapRef.current = map;

    const control = new VantorControlClass(options);
    controlRef.current = control;
    map.addControl(control, options.position || 'top-right');

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

  return null;
}
