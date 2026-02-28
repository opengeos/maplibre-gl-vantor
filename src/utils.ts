import type { FeatureCollection } from 'geojson';
import type { StacItem } from './types';

export function resolveHref(baseUrl: string, href: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }
  return new URL(href, baseUrl).href;
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  return isoString.slice(0, 10);
}

export function itemsToFeatureCollection(items: StacItem[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items
      .filter((item) => item.geometry)
      .map((item) => ({
        type: 'Feature' as const,
        id: item.id,
        geometry: item.geometry!,
        properties: {
          id: item.id,
          phase: item.properties.phase || '',
          datetime: item.properties.datetime || '',
          vehicle_name: item.properties.vehicle_name || item.properties.constellation || '',
          cloud_cover: item.properties['eo:cloud_cover'] ?? '',
        },
      })),
  };
}
