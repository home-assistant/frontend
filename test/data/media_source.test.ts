import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  RESOLVE_CACHE_TIME,
  resolveMediaSourceWithCache,
} from "../../src/data/media_source";
import type { HomeAssistant } from "../../src/types";

const CONTENT_ID = "media-source://image_upload/background";
const OTHER_CONTENT_ID = "media-source://image_upload/other";

// Core signs every resolution with a fresh timestamp, so an uncached resolve of
// the same id yields a different url each time. The mock reproduces that: the
// urls only stay equal if the resolution itself was reused.
const mockHass = () => {
  let signature = 0;
  return {
    callWS: vi.fn(({ media_content_id }: { media_content_id: string }) => {
      signature += 1;
      return Promise.resolve({
        url: `/api/image/serve/${media_content_id.split("/").pop()}/original?authSig=sig${signature}`,
        mime_type: "image/jpeg",
      });
    }),
  } as unknown as HomeAssistant;
};

describe("resolveMediaSourceWithCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the same url when the same content id is resolved again", async () => {
    const hass = mockHass();

    const first = await resolveMediaSourceWithCache(hass, CONTENT_ID);
    const second = await resolveMediaSourceWithCache(hass, CONTENT_ID);

    expect(second.url).toBe(first.url);
    expect(hass.callWS).toHaveBeenCalledTimes(1);
  });

  it("shares a single request between concurrent callers", async () => {
    const hass = mockHass();

    const [first, second] = await Promise.all([
      resolveMediaSourceWithCache(hass, CONTENT_ID),
      resolveMediaSourceWithCache(hass, CONTENT_ID),
    ]);

    expect(second.url).toBe(first.url);
    expect(hass.callWS).toHaveBeenCalledTimes(1);
  });

  it("resolves each content id to its own url", async () => {
    const hass = mockHass();

    const first = await resolveMediaSourceWithCache(hass, CONTENT_ID);
    const other = await resolveMediaSourceWithCache(hass, OTHER_CONTENT_ID);

    expect(first.url).toContain("/background/");
    expect(other.url).toContain("/other/");
    expect(hass.callWS).toHaveBeenCalledTimes(2);
  });

  it("keeps returning the same url when hass is updated", async () => {
    const hass = mockHass();

    const first = await resolveMediaSourceWithCache(hass, CONTENT_ID);
    // State updates replace hass with a shallow copy
    const second = await resolveMediaSourceWithCache(
      { ...hass } as HomeAssistant,
      CONTENT_ID
    );

    expect(second.url).toBe(first.url);
    expect(hass.callWS).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const hass = mockHass();
    vi.mocked(hass.callWS).mockRejectedValueOnce(new Error("unresolvable"));

    await expect(
      resolveMediaSourceWithCache(hass, CONTENT_ID)
    ).rejects.toThrowError("unresolvable");
    const retried = await resolveMediaSourceWithCache(hass, CONTENT_ID);

    expect(retried.url).toContain("authSig=");
    expect(hass.callWS).toHaveBeenCalledTimes(2);
  });

  it("resolves a fresh url once the cached one is about to expire", async () => {
    const hass = mockHass();

    const first = await resolveMediaSourceWithCache(hass, CONTENT_ID);
    vi.advanceTimersByTime(RESOLVE_CACHE_TIME);
    const second = await resolveMediaSourceWithCache(hass, CONTENT_ID);

    expect(second.url).not.toBe(first.url);
    expect(hass.callWS).toHaveBeenCalledTimes(2);
  });

  it("caches for less than the 24 hour signature validity", () => {
    expect(RESOLVE_CACHE_TIME).toBeLessThan(24 * 60 * 60 * 1000);
  });
});
