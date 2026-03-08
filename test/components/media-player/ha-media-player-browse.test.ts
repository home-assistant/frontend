import { describe, expect, it } from "vitest";
import type { MediaPlayerItem } from "../../../src/data/media-player";
import { filterRadioBrowserChildren } from "../../../src/components/media-player/radio-browser-util";

const makeItem = (title: string): MediaPlayerItem =>
  ({
    title,
    media_content_id: `media-source://radio_browser/${title}`,
    media_content_type: "audio/mpeg",
    media_class: "music",
    children_media_class: null,
    can_play: true,
    can_expand: false,
    can_search: false,
    thumbnail: null,
  }) as unknown as MediaPlayerItem;

const ITEMS = [
  makeItem("Rock FM"),
  makeItem("Jazz Vibes"),
  makeItem("Classic Rock Radio"),
  makeItem("Top 40"),
];

describe("filterRadioBrowserChildren", () => {
  it("returns all items when query is empty", () => {
    expect(filterRadioBrowserChildren(ITEMS, "")).toEqual(ITEMS);
  });

  it("filters items by title (case-insensitive)", () => {
    const result = filterRadioBrowserChildren(ITEMS, "rock");
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Rock FM");
    expect(result[1].title).toBe("Classic Rock Radio");
  });

  it("is case-insensitive for uppercase query", () => {
    const result = filterRadioBrowserChildren(ITEMS, "JAZZ");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Jazz Vibes");
  });

  it("returns an empty array when no items match", () => {
    expect(filterRadioBrowserChildren(ITEMS, "zzznomatch")).toHaveLength(0);
  });

  it("returns all items when query matches all titles", () => {
    const result = filterRadioBrowserChildren(ITEMS, "radio");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Classic Rock Radio");
  });

  it("handles an empty items array gracefully", () => {
    expect(filterRadioBrowserChildren([], "rock")).toEqual([]);
  });
});
