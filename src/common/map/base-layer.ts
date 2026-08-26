import type { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import type { Layer } from "leaflet";
import type { StyleSpecification } from "maplibre-gl";
import type { LeafletModuleType } from "../dom/setup-leaflet-map";

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

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

// The zoom range belongs to the map rather than to the base layer: only Leaflet
// tile layers report their own limits, and marker clustering needs the map to
// have a maximum zoom whichever base layer is in use.
export const MAP_MIN_ZOOM = 0;
export const MAP_MAX_ZOOM = 20;

export interface MapBaseLayer {
  layer: Layer;
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
  darkMode: boolean
): Promise<MapBaseLayer> => {
  let currentDarkMode = darkMode;
  const layer = createLayer({
    style: await loadStyle(VECTOR_STYLES[darkMode ? "dark" : "light"]),
    // Renders CJK, kana and hangul with a font from the device, which is why
    // we only have to ship a tenth of the glyph set.
    localIdeographFontFamily: "sans-serif",
    // The page sets a same-origin referrer policy, but the OSMF asks for a
    // referrer to see which application their tiles are serving. Sending it
    // for the tiles alone keeps it to the origin, never the page URL.
    transformRequest: (url) => ({ url, referrerPolicy: "origin" }),
  });
  // The plugin only types the MapLibre options, but the layer hands this to
  // Leaflet's attribution control once the style has loaded.
  layer.options.attribution = OSM_ATTRIBUTION;

  return {
    layer,
    setDarkMode: (newDarkMode: boolean) => {
      if (newDarkMode === currentDarkMode) {
        return;
      }
      currentDarkMode = newDarkMode;
      loadStyle(VECTOR_STYLES[newDarkMode ? "dark" : "light"])
        .then((style) => layer.getMaplibreMap()?.setStyle(style))
        .catch(() => {
          // Keep the style that is on screen, and let the next toggle retry.
          currentDarkMode = !newDarkMode;
        });
    },
  };
};

const createRasterLayer = (leaflet: LeafletModuleType): MapBaseLayer => ({
  layer: leaflet.tileLayer(RASTER_TILE_URL, {
    attribution: OSM_ATTRIBUTION,
    maxNativeZoom: RASTER_MAX_NATIVE_ZOOM,
    maxZoom: MAP_MAX_ZOOM,
  }),
  setDarkMode: () => undefined,
});

export const createBaseLayer = async (
  leaflet: LeafletModuleType,
  darkMode: boolean
): Promise<MapBaseLayer> => {
  if (supportsWebGL2()) {
    try {
      const { maplibreGL: createLayer } =
        await import("@maplibre/maplibre-gl-leaflet");
      return await createVectorLayer(createLayer, darkMode);
    } catch {
      // An instance that cannot load the chunk still gets a map, just a raster
      // one, rather than an empty card.
    }
  }
  return createRasterLayer(leaflet);
};
