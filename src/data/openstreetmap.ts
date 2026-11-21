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

export const formatOpenStreetMapPlace = (
  place: OpenStreetMapPlace
): { primary: string; secondary: string } => {
  const primary = [
    place.name || place.address[place.category],
    place.address.house_number,
    place.address.road || place.address.waterway,
    place.address.village || place.address.town,
    place.address.suburb || place.address.subdivision,
    place.address.city || place.address.municipality,
  ]
    .filter(Boolean)
    .join(", ");

  const secondary = [
    place.address.county ||
      place.address.state_district ||
      place.address.region,
    place.address.state,
    place.address.country,
  ]
    .filter(Boolean)
    .join(", ");

  return { primary, secondary };
};

export const searchPlaces = (
  address: string,
  hass: HomeAssistant,
  addressdetails?: boolean,
  limit?: number
): Promise<OpenStreetMapPlace[]> => {
  const params = new URLSearchParams({
    q: address,
    format: "jsonv2",
    "accept-language": hass.locale.language,
    email: "abuse@home-assistant.io",
  });
  if (limit) {
    params.set("limit", String(limit));
  }
  if (addressdetails) {
    params.set("addressdetails", "1");
  }

  return fetch(
    `https://nominatim.openstreetmap.org/search.php?${params.toString()}`
  ).then((res) => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(res.statusText);
  });
};

export const reverseGeocode = (
  location: [number, number],
  hass: HomeAssistant,
  zoom?: number
): Promise<OpenStreetMapPlace> =>
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
