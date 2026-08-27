import type { Layer, Map } from "leaflet";

// Sets up a Leaflet map on the provided DOM element
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type LeafletModuleType = typeof import("leaflet");

export const setupLeafletMap = async (
  mapElement: HTMLElement,
  initialView?: { latitude: number; longitude: number; zoom?: number }
): Promise<[Map, LeafletModuleType, Layer]> => {
  if (!mapElement.parentNode) {
    throw new Error("Cannot setup Leaflet map on disconnected element");
  }
  // eslint-disable-next-line
  const Leaflet = (await import("leaflet")).default as LeafletModuleType;
  Leaflet.Icon.Default.imagePath = "/static/images/leaflet/images/";

  await import("leaflet.markercluster");

  const mapLibre = await import("maplibre-gl");
  mapLibre.setWorkerUrl("/static/js/maplibre/maplibre-gl-worker.mjs");
  const { maplibreGL } = await import("@maplibre/maplibre-gl-leaflet");

  const map = Leaflet.map(mapElement, { minZoom: 1, maxZoom: 20 });
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

  const mapLibreStyle = document.createElement("link");
  mapLibreStyle.setAttribute("href", "/static/images/maplibre/maplibre-gl.css");
  mapLibreStyle.setAttribute("rel", "stylesheet");
  mapElement.parentNode.appendChild(mapLibreStyle);

  if (initialView) {
    map.setView(
      [initialView.latitude, initialView.longitude],
      initialView.zoom ?? 13
    );
  }

  const mapLibreLayer = maplibreGL({
    style: "https://tiles.openfreemap.org/styles/liberty",
  }).addTo(map);

  return [map, Leaflet, mapLibreLayer];
};
