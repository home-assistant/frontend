import type { HomeAssistant } from "../types";

export interface OpenStreetMapPlace {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  place_rank: number;
  category: string;
  type: string;
  importance: number;
  addresstype: string;
  name: string | null;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    city?: string;
    municipality?: string;
    state?: string;
    country?: string;
    postcode?: string;
    country_code: string;
    [key: string]: string | undefined;
  };
  boundingbox: number[];
}

export const searchPlaces = (
  address: string,
  hass: HomeAssistant,
  addressdetails?: boolean,
  limit?: number
): Promise<OpenStreetMapPlace[]> =>
  // A browser cannot set the User-Agent header, so identification towards
  // Nominatim is done with the `email` query parameter.
  fetch(
    `https://nominatim.openstreetmap.org/search.php?q=${address}&format=jsonv2${
      limit ? `&limit=${limit}` : ""
    }${addressdetails ? "&addressdetails=1" : ""}&accept-language=${
      hass.locale.language
    }&email=abuse@home-assistant.io`
  ).then((res) => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(res.statusText);
  });

export const reverseGeocode = (
  location: [number, number],
  hass: HomeAssistant,
  zoom?: number
): Promise<OpenStreetMapPlace> =>
  // A browser cannot set the User-Agent header, so identification towards
  // Nominatim is done with the `email` query parameter.
  fetch(
    `https://nominatim.openstreetmap.org/reverse.php?lat=${location[0]}&lon=${
      location[1]
    }&accept-language=${hass.locale.language}&zoom=${
      zoom ?? 18
    }&format=jsonv2&email=abuse@home-assistant.io`
  ).then((res) => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(res.statusText);
  });
