import type { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import type { Map as LeafletMap } from "leaflet";
import type { StyleSpecification } from "maplibre-gl";
import type { LeafletModuleType } from "../dom/setup-leaflet-map";

// Only the raster fallback needs this: a Leaflet tile layer reads it, while
// the vector layer takes its attribution from the source in the style, which
// the TileJSON fills in. That is the better way around - the credit follows
// whoever ends up serving the tiles.
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Shortbread vector tiles, served by the OpenStreetMap Foundation under
// https://operations.osmfoundation.org/policies/vector/. Only their tile
// endpoint sends CORS headers, so the style, glyphs and sprites that belong to
// it are served from our own static assets (see build-scripts/gulp/map-assets.js).
const VECTOR_STYLES = {
  light: "/static/map/light.json",
  dark: "/static/map/dark.json",
} as const;

// Raster tiles for browsers that cannot run MapLibre. MapLibre draws raster
// sources through WebGL too, so the fallback has to stay a Leaflet tile layer.
const RASTER_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// The raster tiles stop at 19, the vector tiles at 14 and are overzoomed. Both
// keep rendering up to MAP_MAX_ZOOM.
const RASTER_MAX_NATIVE_ZOOM = 19;

// Browsers keep a limited number of live WebGL contexts - around 16 in Chrome -
// and drop the oldest when a new one is created. A dashboard with more map
// cards than that leaves its first cards blank: MapLibre asks for the context
// back, but nothing frees a slot for it. A transient loss, a GPU reset say,
// does get restored, so give that a moment before falling back to raster.
const CONTEXT_RESTORE_GRACE = 2000;

// The zoom range belongs to the map rather than to the base layer: only Leaflet
// tile layers report their own limits, and marker clustering needs the map to
// have a maximum zoom whichever base layer is in use.
//
// The floor is 1 rather than 0 on the adapter's own advice: at Leaflet zoom 0 it
// drives the MapLibre map to -1, below the range MapLibre is specified for. No
// drift was measurable there, but nobody looks at their house from world zoom,
// so there is nothing to weigh against staying inside spec.
export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 20;

export interface MapBaseLayer {
  // Vector styles carry their own dark cartography. The raster layer has no
  // dark variant and is inverted with a CSS filter instead, so this is a no-op
  // for it.
  setDarkMode: (darkMode: boolean) => void;
}

let webGL2Supported: boolean | undefined;

// MapLibre needs WebGL2, which rules out iOS below 15, older Android tablets
// and any device whose driver is blocklisted by the browser.
const supportsWebGL2 = (): boolean => {
  if (webGL2Supported === undefined) {
    try {
      const context = document.createElement("canvas").getContext("webgl2");
      webGL2Supported = Boolean(context);
      // Browsers only keep a handful of contexts alive per page, so this probe
      // must not hold on to one.
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webGL2Supported = false;
    }
  }
  return webGL2Supported;
};

// The generated styles keep their asset URLs origin relative so they follow
// whatever host the instance is reached on, but MapLibre rejects a relative
// sprite URL. The glyph URL is left alone: its {fontstack} and {range}
// placeholders would come back percent encoded, and MapLibre resolves it fine.
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
  darkMode: boolean
): Promise<MapBaseLayer | undefined> => {
  let layer: ReturnType<typeof maplibreGL> | undefined;

  try {
    layer = createLayer({
      style: await loadStyle(VECTOR_STYLES[darkMode ? "dark" : "light"]),
      // Renders CJK, kana and hangul with a font from the device, which is why
      // we only have to ship a tenth of the glyph set.
      localIdeographFontFamily: "sans-serif",
      // The page sets a same-origin referrer policy, but the OSMF asks for a
      // referrer to see which application their tiles are serving. Sending it
      // for the tiles alone keeps it to the origin, never the page URL.
      transformRequest: (url) => ({ url, referrerPolicy: "origin" }),
    });
    // The plugin builds the MapLibre map in `onAdd`, so this is where a
    // missing WebGL context, a blocked worker or a rejected blob URL throws.
    // Adding the layer has to stay inside the guard for the raster fallback to
    // cover those, not just a browser without WebGL2 at all.
    layer.addTo(map);
  } catch {
    if (layer) {
      try {
        layer.remove();
      } catch {
        // The layer never finished being added, so there may be nothing to
        // tear down. Either way the raster layer replaces it.
      }
    }
    return undefined;
  }

  // What is on screen, and what was last asked for. Those differ while a style
  // is in flight, and a failed request has to roll back to the former: with
  // several requests in flight the opposite of the failed one is not
  // necessarily what is displayed, and guessing wrong makes the next toggle a
  // no-op that leaves the map on the other theme for good.
  let appliedDarkMode = darkMode;
  let requestedDarkMode = darkMode;
  // Styles are fetched, so a burst of theme changes can resolve out of order.
  // Only the newest request may touch the map.
  let latestRequest = 0;
  let vector = true;

  const glMap = layer.getMaplibreMap();
  let fallbackTimeout: number | undefined;
  let contextLost = false;

  // Only ever fires after the three of these are initialized.
  const handleVisibilityChange = () => {
    if (contextLost) {
      scheduleSwap();
    }
  };

  const swapToRaster = () => {
    vector = false;
    // The MapLibre map goes with the layer, so there is nothing left to wait
    // for a context for.
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    try {
      layer.remove();
    } catch {
      // Nothing left to detach, the raster layer replaces it either way.
    }
    createRasterLayer(leaflet, map);
  };

  const scheduleSwap = () => {
    clearTimeout(fallbackTimeout);
    // A backgrounded tab is the other reason a context goes away, and there it
    // does come back when the page is shown again. Only run the clock while the
    // map is on screen, or switching apps for a while would be enough to come
    // back to a raster map.
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
    // Leaving these behind would revive a map that is already gone.
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
            // Keep the style that is on screen, and let the next toggle retry.
            requestedDarkMode = appliedDarkMode;
          }
        });
    },
  };
};

const createRasterLayer = (
  leaflet: LeafletModuleType,
  map: LeafletMap
): MapBaseLayer => {
  leaflet
    .tileLayer(RASTER_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxNativeZoom: RASTER_MAX_NATIVE_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      // The tile images inherit the page's same-origin referrer policy, which
      // sends nothing at all cross-origin. OSM's raster tile policy asks for a
      // referrer, and being blocked would take out the fallback on exactly the
      // devices that depend on it.
      referrerPolicy: "origin",
      // The devices that end up here are the old retina tablets, and OSM
      // serves no @2x raster tiles, so sharp tiles have to come from loading a
      // zoom level deeper at half the tile size.
      detectRetina: true,
    })
    .addTo(map);

  return { setDarkMode: () => undefined };
};

export const createBaseLayer = async (
  leaflet: LeafletModuleType,
  map: LeafletMap,
  darkMode: boolean
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
        darkMode
      );
    } catch {
      // An instance that cannot load the chunk still gets a map, just a raster
      // one, rather than an empty card.
    }
    if (vectorLayer) {
      return vectorLayer;
    }
  }
  return createRasterLayer(leaflet, map);
};
