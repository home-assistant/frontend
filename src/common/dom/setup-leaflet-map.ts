import type { Map } from "leaflet";
import type { MapBaseLayer } from "../map/base-layer";
import { createBaseLayer, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from "../map/base-layer";

// Sets up a Leaflet map on the provided DOM element
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type LeafletModuleType = typeof import("leaflet");

export interface LeafletMapSetup {
  map: Map;
  leaflet: LeafletModuleType;
  baseLayer: MapBaseLayer;
}

export const setupLeafletMap = async (
  mapElement: HTMLElement,
  initialView?: {
    latitude: number;
    longitude: number;
    zoom?: number;
    darkMode?: boolean;
    token?: string;
  }
): Promise<LeafletMapSetup> => {
  if (!mapElement.parentNode) {
    throw new Error("Cannot setup Leaflet map on disconnected element");
  }
  // eslint-disable-next-line
  const Leaflet = (await import("leaflet")).default as LeafletModuleType;
  Leaflet.Icon.Default.imagePath = "/static/images/leaflet/images/";

  await import("leaflet.markercluster");

  const map = Leaflet.map(mapElement, {
    minZoom: MAP_MIN_ZOOM,
    maxZoom: MAP_MAX_ZOOM,
  });
  map.attributionControl.setPrefix("");
  const style = document.createElement("link");
  style.setAttribute("href", "/static/images/leaflet/leaflet.css");
  style.setAttribute("rel", "stylesheet");
  mapElement.parentNode.appendChild(style);

  const markerClusterStyle = document.createElement("link");
  markerClusterStyle.setAttribute(
    "href",
    "/static/images/leaflet/MarkerCluster.css"
  );
  markerClusterStyle.setAttribute("rel", "stylesheet");
  mapElement.parentNode.appendChild(markerClusterStyle);

  if (initialView) {
    map.setView(
      [initialView.latitude, initialView.longitude],
      initialView.zoom ?? 13
    );
  }

  // The base layer adds itself: the vector layer only builds its MapLibre map
  // once it is on the map, and that failing has to fall back to raster.
  const baseLayer = await createBaseLayer(
    Leaflet,
    map,
    initialView?.darkMode ?? false,
    initialView?.token
  );

  return { map, leaflet: Leaflet, baseLayer };
};
