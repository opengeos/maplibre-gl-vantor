import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { VantorControl } from '../../src/index';

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [46.0, -18.0],
      zoom: 5,
    });

    m.addControl(new maplibregl.NavigationControl(), 'top-left');

    m.on('load', () => {
      setMap(m);

      const vantor = new VantorControl({
        position: 'top-right',
      });
      m.addControl(vantor);
    });

    return () => {
      m.remove();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
