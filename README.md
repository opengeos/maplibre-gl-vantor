# maplibre-gl-vantor

[![npm version](https://img.shields.io/npm/v/maplibre-gl-vantor.svg)](https://www.npmjs.com/package/maplibre-gl-vantor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A [MapLibre GL JS](https://maplibre.org/) plugin for searching, visualizing, and downloading satellite imagery from the [Vantor Open Data](https://radiantearth.github.io/stac-browser/#/external/vantor-opendata.s3.amazonaws.com/events/catalog.json) STAC catalog.

## Features

- Browse disaster event collections from the Vantor STAC catalog
- Search imagery by event, phase (pre/post), map extent, or drawn bounding box
- Display image footprints on the map (blue for pre-event, red for post-event)
- Bidirectional selection: click a table row to highlight on map, click a footprint to highlight in table
- Visualize Cloud-Optimized GeoTIFFs (COGs) directly on the map via [deck.gl-geotiff](https://www.npmjs.com/package/@developmentseed/deck.gl-geotiff)
- Nodata masking for transparent rendering of background pixels
- Download selected COG files
- Sortable results table with multi-select
- React component wrapper included

## Installation

```bash
npm install maplibre-gl-vantor maplibre-gl
```

### Optional: COG Visualization

To enable COG raster visualization on the map, install these additional packages:

```bash
npm install @deck.gl/core @deck.gl/mapbox @developmentseed/deck.gl-geotiff geotiff-geokeys-to-proj4 proj4
```

## Quick Start

### Vanilla JavaScript / TypeScript

```js
import maplibregl from "maplibre-gl";
import { VantorControl } from "maplibre-gl-vantor";
import "maplibre-gl/dist/maplibre-gl.css";
import "maplibre-gl-vantor/style.css";

const map = new maplibregl.Map({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  center: [46.0, -18.0],
  zoom: 5,
});

map.addControl(new VantorControl(), "top-right");
```

### React

```tsx
import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import { VantorControl } from "maplibre-gl-vantor";
import "maplibre-gl/dist/maplibre-gl.css";
import "maplibre-gl-vantor/style.css";

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [46.0, -18.0],
      zoom: 5,
    });

    map.on("load", () => {
      map.addControl(new VantorControl(), "top-right");
    });

    return () => map.remove();
  }, []);

  return <div ref={mapContainer} style={{ width: "100vw", height: "100vh" }} />;
}
```

### React Component Wrapper

A dedicated React component is also available:

```tsx
import { VantorControl } from "maplibre-gl-vantor/react";

// Inside your component where you have a map instance:
<VantorControl map={mapInstance} position="top-right" />
```

## Options

The `VantorControl` constructor accepts a `VantorControlOptions` object:

| Option              | Type                          | Default                | Description                                                                           |
| ------------------- | ----------------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `catalogUrl`        | `string`                      | Vantor catalog URL     | STAC catalog root URL                                                                 |
| `position`          | `string`                      | `'top-right'`          | Map control position (`'top-left'`, `'top-right'`, `'bottom-left'`, `'bottom-right'`) |
| `collapsed`         | `boolean`                     | `false`                | Start with the panel collapsed                                                        |
| `panelWidth`        | `number`                      | `380`                  | Panel width in pixels                                                                 |
| `maxHeight`         | `number \| string`            | `'calc(100vh - 40px)'` | Panel max height. Number for pixels, string for any CSS value (e.g., `'80vh'`)        |
| `onItemsLoaded`     | `(items: StacItem[]) => void` | -                      | Callback fired when search results are loaded                                         |
| `onSelectionChange` | `(items: StacItem[]) => void` | -                      | Callback fired when item selection changes                                            |

### Example with Options

```js
const vantor = new VantorControl({
  position: "top-right",
  collapsed: false,
  panelWidth: 400,
  maxHeight: "80vh",
  onItemsLoaded: (items) => {
    console.log(`Loaded ${items.length} items`);
  },
});

map.addControl(vantor);
```

## API

### `VantorControl`

Main MapLibre GL control implementing `IControl`.

```ts
const control = new VantorControl(options?: VantorControlOptions);
map.addControl(control, "top-right");
// Later:
map.removeControl(control);
```

### `StacClient`

Standalone STAC client for programmatic access to the Vantor catalog.

```ts
import { StacClient } from "maplibre-gl-vantor";

const client = new StacClient();

// Fetch all disaster events
const events = await client.fetchCatalog();

// Fetch items for an event
const items = await client.fetchItems(events[0].href);

// Filter by phase
const postItems = client.filterItemsByPhase(items, "post");

// Filter by bounding box
const filtered = client.filterItemsByBBox(items, {
  west: 44.0,
  south: -20.0,
  east: 48.0,
  north: -16.0,
});

// Get COG URL for an item
const cogUrl = client.getCogUrl(items[0]);

// Get display properties
const props = client.getItemProperties(items[0]);
```

### `DrawBBox`

Interactive bounding box drawing tool.

```ts
import { DrawBBox } from "maplibre-gl-vantor";

const draw = new DrawBBox(map);

// Activate drawing mode (returns a Promise)
const bbox = await draw.activate();
console.log(bbox); // { west, south, east, north }

// Programmatically set a bbox
draw.setBBox({ west: 44, south: -20, east: 48, north: -16 });

// Clear drawn bbox
draw.clear();
```

### Exported Types

All TypeScript interfaces are exported:

```ts
import type {
  VantorControlOptions,
  StacItem,
  StacCollection,
  StacCatalog,
  StacLink,
  StacAsset,
  StacItemProperties,
  EventInfo,
  BBox,
  PhaseFilter,
  ItemProperties,
} from "maplibre-gl-vantor";
```

## Development

```bash
# Install dependencies
npm install

# Start dev server with vanilla example
npm run dev

# Build library
npm run build

# Lint
npm run lint

# Format
npm run format
```

### Project Structure

```
src/
  index.ts              # Public exports
  types.ts              # TypeScript interfaces
  control.ts            # MapLibre IControl orchestrator
  panel.ts              # Panel UI (DOM construction & events)
  stac-client.ts        # STAC catalog client
  cog-layer.ts          # COG visualization via deck.gl-geotiff
  footprint-layer.ts    # GeoJSON footprint polygons
  highlight-layer.ts    # Highlight for focused footprint
  draw-bbox.ts          # Interactive bounding box drawing
  download.ts           # File download manager
  utils.ts              # Utility functions
  styles.css            # Panel styles
  react/
    VantorControl.tsx   # React component wrapper
examples/
  vanilla/              # Vanilla JS example
  react/                # React example
```

## Docker

```bash
docker build -t vantor .
docker run -p 8080:80 vantor
```

Then open http://localhost:8080.

## License

[MIT](LICENSE)
