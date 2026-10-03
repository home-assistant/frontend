import { describe, expect, it, vi } from "vitest";
import { fetchHostDisksUsage } from "../../src/data/hassio/host";
import type { HomeAssistant } from "../../src/types";

const mockHass = () => {
  const callWS = vi.fn().mockResolvedValue({
    id: "root",
    label: "Total",
    total_bytes: 2000398934016,
    used_bytes: 1240247081779,
  });
  return { hass: { callWS } as unknown as HomeAssistant, callWS };
};

const sentMessage = (callWS: ReturnType<typeof vi.fn>) =>
  callWS.mock.calls[0][0];

describe("fetchHostDisksUsage", () => {
  it("targets the data disk and sends no depth by default", async () => {
    const { hass, callWS } = mockHass();
    await fetchHostDisksUsage(hass);
    expect(callWS).toHaveBeenCalledWith({
      type: "supervisor/api",
      endpoint: "/host/disks/default/usage",
      method: "get",
      timeout: 3600,
    });
  });

  it("addresses a mount by name", async () => {
    const { hass, callWS } = mockHass();
    await fetchHostDisksUsage(hass, "media_nas");
    expect(sentMessage(callWS).endpoint).toBe("/host/disks/media_nas/usage");
  });

  // Walking a mount costs a round trip per directory, so the row fetch must let
  // the Supervisor apply its own per-target default rather than pinning one.
  it("omits max_depth for a mount", async () => {
    const { hass, callWS } = mockHass();
    await fetchHostDisksUsage(hass, "media_nas");
    expect(sentMessage(callWS)).not.toHaveProperty("params");
  });

  it("sends max_depth only when a caller asks for it", async () => {
    const { hass, callWS } = mockHass();
    await fetchHostDisksUsage(hass, "default", 3);
    expect(sentMessage(callWS).params).toEqual({ max_depth: 3 });
  });

  it("sends max_depth 0 when explicitly asked, rather than dropping it", async () => {
    const { hass, callWS } = mockHass();
    await fetchHostDisksUsage(hass, "media_nas", 0);
    expect(sentMessage(callWS).params).toEqual({ max_depth: 0 });
  });

  it("returns the usage tree", async () => {
    const { hass } = mockHass();
    await expect(fetchHostDisksUsage(hass, "media_nas")).resolves.toMatchObject(
      {
        total_bytes: 2000398934016,
        used_bytes: 1240247081779,
      }
    );
  });
});
