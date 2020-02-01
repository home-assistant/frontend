import { Map } from "leaflet";

// Sets up a Leaflet map on the provided DOM element
export type LeafletModuleType = typeof import("leaflet");
export type LeafletDrawModuleType = typeof import("leaflet-draw");

export const setupLeafletMap = async (
  mapElement: HTMLElement,
  darkMode = false,
  draw = false
): Promise<[Map, LeafletModuleType]> => {
  if (!mapElement.parentNode) {
    throw new Error("Cannot setup Leaflet map on disconnected element");
  }
  // tslint:disable-next-line
  const Leaflet = (await import(
    /* webpackChunkName: "leaflet" */ "leaflet"
  )) as LeafletModuleType;
  Leaflet.Icon.Default.imagePath = "/static/images/leaflet/images/";

  if (draw) {
    await import(/* webpackChunkName: "leaflet-draw" */ "leaflet-draw");
  }

  const map = Leaflet.map(mapElement);
  const style = document.createElement("link");
  style.setAttribute("href", "/static/images/leaflet/leaflet.css");
  style.setAttribute("rel", "stylesheet");
  mapElement.parentNode.appendChild(style);
  map.setView([52.3731339, 4.8903147], 13);
  createTileLayer(Leaflet, darkMode).addTo(map);

  return [map, Leaflet];
};

export const createTileLayer = (
  leaflet: LeafletModuleType,
  darkMode: boolean
) => {
  return leaflet.tileLayer(
    `https://{s}.basemaps.cartocdn.com/${
      darkMode ? "dark_all" : "light_all"
    }/{z}/{x}/{y}${leaflet.Browser.retina ? "@2x.png" : ".png"}`,
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      minZoom: 0,
      maxZoom: 20,
    }
  );
};
