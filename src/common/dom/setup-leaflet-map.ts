import type { Map, TileLayer } from "leaflet";

// Sets up a Leaflet map on the provided DOM element
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type LeafletModuleType = typeof import("leaflet");
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type LeafletDrawModuleType = typeof import("leaflet-draw");

export const setupLeafletMap = async (
  mapElement: HTMLElement
): Promise<[Map, LeafletModuleType, TileLayer]> => {
  if (!mapElement.parentNode) {
    throw new Error("Cannot setup Leaflet map on disconnected element");
  }
  // eslint-disable-next-line
  const Leaflet = (await import("leaflet")).default as LeafletModuleType;
  Leaflet.Icon.Default.imagePath = "/static/images/leaflet/images/";

  await import("leaflet.markercluster");

  const map = Leaflet.map(mapElement);
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

  map.setView([52.3731339, 4.8903147], 13);

  const tileLayer = createTileLayer(Leaflet).addTo(map);

  return [map, Leaflet, tileLayer];
};

export const replaceTileLayer = (
  leaflet: LeafletModuleType,
  map: Map,
  tileLayer: TileLayer
): TileLayer => {
  map.removeLayer(tileLayer);
  tileLayer = createTileLayer(leaflet);
  tileLayer.addTo(map);
  return tileLayer;
};

const createTileLayer = (leaflet: LeafletModuleType): TileLayer =>
  leaflet.tileLayer(
    `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${
      leaflet.Browser.retina ? "@2x.png" : ".png"
    }`,
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      minZoom: 0,
      maxZoom: 20,
    }
  );
