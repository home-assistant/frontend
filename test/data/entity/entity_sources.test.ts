import type { HassEntities } from "home-assistant-js-websocket";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchEntitySourcesWithCache } from "../../../src/data/entity/entity_sources";
import type { HomeAssistant } from "../../../src/types";

const states = { "light.kitchen": {} } as unknown as HassEntities;

const mockCallWS = () =>
  vi.fn().mockResolvedValue({
    "light.kitchen": { domain: "hue" },
  }) as unknown as HomeAssistant["callWS"] & ReturnType<typeof vi.fn>;

describe("fetchEntitySourcesWithCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reuses the result for the same callWS within 30 seconds", async () => {
    const callWS = mockCallWS();

    await fetchEntitySourcesWithCache(callWS, states);
    await vi.advanceTimersByTimeAsync(29_000);
    await fetchEntitySourcesWithCache(callWS, { ...states });

    expect(callWS).toHaveBeenCalledTimes(1);
    expect(callWS).toHaveBeenCalledWith({ type: "entity/source" });
  });

  it("refetches after 30 seconds", async () => {
    const callWS = mockCallWS();

    await fetchEntitySourcesWithCache(callWS, states);
    await vi.advanceTimersByTimeAsync(30_000);
    await fetchEntitySourcesWithCache(callWS, states);

    expect(callWS).toHaveBeenCalledTimes(2);
  });

  it("refetches when the number of states changes", async () => {
    const callWS = mockCallWS();

    await fetchEntitySourcesWithCache(callWS, states);
    await fetchEntitySourcesWithCache(callWS, {
      ...states,
      "light.hall": {},
    } as unknown as HassEntities);

    expect(callWS).toHaveBeenCalledTimes(2);
  });

  it("keeps a separate cache per callWS", async () => {
    const first = mockCallWS();
    const second = mockCallWS();

    await fetchEntitySourcesWithCache(first, states);
    await fetchEntitySourcesWithCache(second, states);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
