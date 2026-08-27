import type { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import type { Map as LeafletMap, TileLayerOptions } from "leaflet";
import type { StyleSpecification } from "maplibre-gl";
import type { LeafletModuleType } from "../dom/setup-leaflet-map";
import {
  MAP_TILES_PATH,
  subscribeMapTilesToken,
  withMapTilesToken,
} from "../../data/map_tiles";

// Shortbread vector tiles from the OpenStreetMap Foundation. Only their tile
// endpoint sends CORS headers, so the style, glyphs and sprites are ours to
// serve - see build-scripts/gulp/map-assets.js. The credit comes from the
// TileJSON rather than from here, deliberately: it follows whoever serves the
// tiles.
const VECTOR_STYLES = {
  light: "/static/map/light.json",
  dark: "/static/map/dark.json",
} as const;

// Fallback for browsers without WebGL2, which MapLibre needs even for raster,
// so it stays a Leaflet tile layer. OSM serves no @2x variant of these.
const RASTER_TILE_URL = `${MAP_TILES_PATH}/raster/{z}/{x}/{y}.png?token={token}`;
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Browsers keep about 16 live WebGL contexts and drop the oldest, so a dashboard
// full of map cards loses its first ones for good - nothing frees a slot for
// MapLibre to reclaim. A transient loss does get restored, hence the grace.
const CONTEXT_RESTORE_GRACE = 2000;

// On the map, not the layer: only Leaflet tile layers report their own limits,
// and marker clustering throws without a maximum. The floor is 1 because at
// Leaflet zoom 0 the adapter drives MapLibre to -1, outside its range.
export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 20;

// Leaflet substitutes any option into the URL template, but its types only
// cover the ones it defines itself.
type TokenTileLayerOptions = TileLayerOptions & { token?: string };

export interface MapBaseLayer {
  // A no-op for raster, which has no dark variant and is inverted in CSS.
  setDarkMode: (darkMode: boolean) => void;
}

let webGL2Supported: boolean | undefined;

// Rules out iOS below 15, older Android tablets, and blocklisted drivers.
const supportsWebGL2 = (): boolean => {
  if (webGL2Supported === undefined) {
    try {
      const context = document.createElement("canvas").getContext("webgl2");
      webGL2Supported = Boolean(context);
      // Contexts are scarce; the probe must not keep one.
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webGL2Supported = false;
    }
  }
  return webGL2Supported;
};

// Asset URLs are stored origin relative so they follow the instance's host, but
// MapLibre rejects a relative sprite URL. The glyph URL is left alone: URL
// encoding would mangle its {fontstack} and {range} placeholders.
const loadStyle = async (url: string): Promise<StyleSpecification> => {
  const style: StyleSpecification = await (await fetch(url)).json();
  if (typeof style.sprite === "string") {
    style.sprite = new URL(style.sprite, location.href).href;
  } else if (Array.isArray(style.sprite)) {
    style.sprite = style.sprite.map((sprite) => ({
      ...sprite,
      url: new URL(sprite.url, location.href).href,
    }));
  }
  return style;
};

const createVectorLayer = async (
  createLayer: typeof maplibreGL,
  leaflet: LeafletModuleType,
  map: LeafletMap,
  darkMode: boolean,
  token: string | undefined
): Promise<MapBaseLayer | undefined> => {
  let layer: ReturnType<typeof maplibreGL> | undefined;

  try {
    layer = createLayer({
      style: await loadStyle(VECTOR_STYLES[darkMode ? "dark" : "light"]),
      // Every request goes to the token gated proxy, and tiles are fetched from
      // a worker that has no document to resolve a relative URL against.
      transformRequest: (url) => ({ url: withMapTilesToken(url) }),
    });
    // The plugin builds the MapLibre map in `onAdd`, so a refused context, a
    // blocked worker or a rejected blob URL throws here. Keep it inside the
    // guard or those lose the raster fallback.
    layer.addTo(map);
  } catch {
    if (layer) {
      try {
        layer.remove();
      } catch {
        // May never have finished being added.
      }
    }
    return undefined;
  }

  // Tracked apart because a failed request must roll back to what is displayed,
  // not to the opposite of what it asked for - with several in flight those are
  // different, and guessing wrong makes the next toggle a permanent no-op.
  let appliedDarkMode = darkMode;
  let requestedDarkMode = darkMode;
  // Styles are fetched, so only the newest request may touch the map.
  let latestRequest = 0;
  let vector = true;

  const glMap = layer.getMaplibreMap();
  let fallbackTimeout: number | undefined;
  let contextLost = false;

  // Declared first, but only ever called once all three exist.
  const handleVisibilityChange = () => {
    if (contextLost) {
      scheduleSwap();
    }
  };

  const swapToRaster = () => {
    vector = false;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    try {
      layer.remove();
    } catch {
      // Nothing left to detach.
    }
    createRasterLayer(leaflet, map, token);
  };

  const scheduleSwap = () => {
    clearTimeout(fallbackTimeout);
    // Backgrounding also drops the context, and there it comes back on return.
    // Running the clock then would make switching apps enough to lose vector.
    if (!vector || document.hidden) {
      return;
    }
    fallbackTimeout = window.setTimeout(swapToRaster, CONTEXT_RESTORE_GRACE);
  };

  glMap.on("webglcontextlost", () => {
    contextLost = true;
    scheduleSwap();
  });
  glMap.on("webglcontextrestored", () => {
    contextLost = false;
    clearTimeout(fallbackTimeout);
  });
  document.addEventListener("visibilitychange", handleVisibilityChange);

  map.on("unload", () => {
    // Otherwise the timer revives a map that is already gone.
    clearTimeout(fallbackTimeout);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  });

  return {
    setDarkMode: (newDarkMode: boolean) => {
      if (!vector || newDarkMode === requestedDarkMode) {
        return;
      }
      requestedDarkMode = newDarkMode;
      const request = ++latestRequest;

      loadStyle(VECTOR_STYLES[newDarkMode ? "dark" : "light"])
        .then((style) => {
          if (request === latestRequest) {
            appliedDarkMode = newDarkMode;
            layer.getMaplibreMap()?.setStyle(style);
          }
        })
        .catch(() => {
          if (request === latestRequest) {
            requestedDarkMode = appliedDarkMode;
          }
        });
    },
  };
};

const createRasterLayer = (
  leaflet: LeafletModuleType,
  map: LeafletMap,
  token: string | undefined
): MapBaseLayer => {
  const layer = leaflet
    .tileLayer(RASTER_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: MAP_MAX_ZOOM,
      // Leaflet throws while building a tile URL if a template variable is
      // undefined, so an absent token has to be empty rather than missing: the
      // tiles 403 and the map stays empty, but the markers still draw.
      token: token ?? "",
    } as TokenTileLayerOptions)
    .addTo(map);

  // Leaflet substitutes the template from `options` on every tile request, so
  // updating this is enough for a refreshed token to be picked up.
  const unsubscribe = subscribeMapTilesToken((newToken) => {
    (layer.options as TokenTileLayerOptions).token = newToken;
  });
  map.on("unload", unsubscribe);

  return { setDarkMode: () => undefined };
};

export const createBaseLayer = async (
  leaflet: LeafletModuleType,
  map: LeafletMap,
  darkMode: boolean,
  token: string | undefined
): Promise<MapBaseLayer> => {
  if (supportsWebGL2()) {
    let vectorLayer: MapBaseLayer | undefined;
    try {
      const { maplibreGL: createLayer } =
        await import("@maplibre/maplibre-gl-leaflet");
      vectorLayer = await createVectorLayer(
        createLayer,
        leaflet,
        map,
        darkMode,
        token
      );
    } catch {
      // No chunk, no vector map - but still a map.
    }
    if (vectorLayer) {
      return vectorLayer;
    }
  }
  return createRasterLayer(leaflet, map, token);
};
