import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatOpenStreetMapPlace,
  searchPlaces,
  type OpenStreetMapPlace,
} from "../../src/data/openstreetmap";
import type { HomeAssistant } from "../../src/types";

const hass = { locale: { language: "en" } } as HomeAssistant;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchPlaces", () => {
  it("encodes raw search queries as URL parameters", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("[]"));
    vi.stubGlobal("fetch", fetchMock);

    await searchPlaces("10 Downing Street & London", hass, true, 3);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("q")).toBe("10 Downing Street & London");
    expect(url.searchParams.get("addressdetails")).toBe("1");
    expect(url.searchParams.get("limit")).toBe("3");
    expect(url.searchParams.get("accept-language")).toBe("en");
  });
});

describe("formatOpenStreetMapPlace", () => {
  it("formats a place and its regional details consistently", () => {
    const place = {
      place_id: 1,
      licence: "",
      osm_type: "relation",
      osm_id: 1,
      lat: "51.5034",
      lon: "-0.1276",
      place_rank: 1,
      category: "place",
      type: "city",
      importance: 1,
      addresstype: "city",
      name: "London",
      display_name: "London, England, United Kingdom",
      address: {
        house_number: "10",
        road: "Downing Street",
        city: "London",
        state: "England",
        country: "United Kingdom",
        country_code: "gb",
      },
      boundingbox: [],
    } satisfies OpenStreetMapPlace;

    expect(formatOpenStreetMapPlace(place)).toEqual({
      primary: "London, 10, Downing Street, London",
      secondary: "England, United Kingdom",
    });
  });
});
