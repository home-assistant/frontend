import { Map } from "leaflet";

// Sets up a Leaflet map on the provided DOM element
export type LeafletModuleType = typeof import("leaflet");

export const setupLeafletMap = async (
  mapElement: HTMLElement
): Promise<[Map, LeafletModuleType]> => {
  if (!mapElement.parentNode) {
    throw new Error("Cannot setup Leaflet map on disconnected element");
  }
  // tslint:disable-next-line
  const Leaflet = (await import(/* webpackChunkName: "leaflet" */ "leaflet")) as LeafletModuleType;
  Leaflet.Icon.Default.imagePath = "/static/images/leaflet";

  const map = Leaflet.map(mapElement);
  const style = document.createElement("link");
  style.setAttribute("href", "/static/images/leaflet/leaflet.css");
  style.setAttribute("rel", "stylesheet");
  mapElement.parentNode.appendChild(style);
  map.setView([51.505, -0.09], 13);
  Leaflet.tileLayer(
    `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}${
      Leaflet.Browser.retina ? "@2x.png" : ".png"
    }`,
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      minZoom: 0,
      maxZoom: 20,
    }
  ).addTo(map);

  return [map, Leaflet];
};
