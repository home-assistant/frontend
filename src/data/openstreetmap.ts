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
  language?: string,
  addressdetails?: boolean,
  limit?: number
): Promise<OpenStreetMapPlace[]> =>
  fetch(
    `https://nominatim.openstreetmap.org/search.php?q=${address}&format=jsonv2${
      limit ? `&limit=${limit}` : ""
    }${addressdetails ? "&addressdetails=1" : ""}${
      language ? `&accept-language=${language}` : ""
    }`
  ).then((res) => res.json());

export const reverseGeocode = (
  location: [number, number],
  language?: string,
  zoom?: number
): Promise<OpenStreetMapPlace> =>
  fetch(
    `https://nominatim.openstreetmap.org/reverse.php?lat=${location[0]}&lon=${
      location[1]
    }${language ? `&accept-language=${language}` : ""}&zoom=${
      zoom ?? 18
    }&format=jsonv2`
  ).then((res) => res.json());
