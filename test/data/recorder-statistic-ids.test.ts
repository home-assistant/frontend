import { describe, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../../src/types";
import {
  getStatisticIds,
  type StatisticsMetaData,
} from "../../src/data/recorder";

const createHass = (callWS = vi.fn()) =>
  ({
    callWS,
  }) as unknown as Pick<HomeAssistant, "callWS">;

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe("getStatisticIds", () => {
  it("shares concurrent requests for the same statistic type", async () => {
    const request = deferred<StatisticsMetaData[]>();
    const callWS = vi.fn().mockReturnValue(request.promise);
    const hass = createHass(callWS);

    const first = getStatisticIds(hass);
    const second = getStatisticIds(hass);

    expect(callWS).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    request.resolve([]);
    await Promise.all([first, second]);
  });

  it("works with callers that only expose callWS", async () => {
    const request = deferred<StatisticsMetaData[]>();
    const callWS = vi.fn().mockReturnValue(request.promise);
    const api = { callWS } as Pick<HomeAssistant, "callWS">;

    const first = getStatisticIds(api);
    const second = getStatisticIds(api);

    expect(callWS).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    request.resolve([]);
    await Promise.all([first, second]);
  });

  it("shares requests across callers with the same callWS", async () => {
    const request = deferred<StatisticsMetaData[]>();
    const callWS = vi.fn().mockReturnValue(request.promise);
    const firstHass = createHass(callWS);
    const secondHass = createHass(callWS);

    const first = getStatisticIds(firstHass);
    const second = getStatisticIds(secondHass);

    expect(callWS).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    request.resolve([]);
    await Promise.all([first, second]);
  });

  it("does not share requests for different statistic types", async () => {
    const callWS = vi.fn().mockResolvedValue([]);
    const hass = createHass(callWS);

    await Promise.all([
      getStatisticIds(hass),
      getStatisticIds(hass, "mean"),
      getStatisticIds(hass, "sum"),
    ]);

    expect(callWS).toHaveBeenCalledTimes(3);
    expect(callWS).toHaveBeenNthCalledWith(1, {
      type: "recorder/list_statistic_ids",
      statistic_type: undefined,
    });
    expect(callWS).toHaveBeenNthCalledWith(2, {
      type: "recorder/list_statistic_ids",
      statistic_type: "mean",
    });
    expect(callWS).toHaveBeenNthCalledWith(3, {
      type: "recorder/list_statistic_ids",
      statistic_type: "sum",
    });
  });

  it("does not share requests across different callWS owners", async () => {
    const firstRequest = deferred<StatisticsMetaData[]>();
    const secondRequest = deferred<StatisticsMetaData[]>();

    const firstCallWS = vi.fn().mockReturnValue(firstRequest.promise);
    const secondCallWS = vi.fn().mockReturnValue(secondRequest.promise);

    const first = getStatisticIds(createHass(firstCallWS));
    const second = getStatisticIds(createHass(secondCallWS));

    expect(firstCallWS).toHaveBeenCalledTimes(1);
    expect(secondCallWS).toHaveBeenCalledTimes(1);
    expect(second).not.toBe(first);

    firstRequest.resolve([]);
    secondRequest.resolve([]);
    await Promise.all([first, second]);
  });

  it("fetches again after the previous request settles", async () => {
    const callWS = vi.fn().mockResolvedValue([]);
    const hass = createHass(callWS);

    await getStatisticIds(hass, "sum");
    await getStatisticIds(hass, "sum");

    expect(callWS).toHaveBeenCalledTimes(2);
  });

  it("retries after a failed request", async () => {
    const callWS = vi
      .fn()
      .mockRejectedValueOnce(new Error("failed"))
      .mockResolvedValueOnce([]);
    const hass = createHass(callWS);

    await expect(getStatisticIds(hass)).rejects.toThrow("failed");
    await getStatisticIds(hass);

    expect(callWS).toHaveBeenCalledTimes(2);
  });
});
