import { describe, expect, it } from "vitest";
import { createZHANetworkChartData } from "../../../../../../../src/panels/config/integrations/integration-panels/zha/zha-network-data";
import type { ZHADevice } from "../../../../../../../src/data/zha";
import type { HomeAssistant } from "../../../../../../../src/types";

const hass = {
  devices: {},
  areas: {},
  localize: () => "",
} as unknown as HomeAssistant;

const device = (partial: Partial<ZHADevice>): ZHADevice =>
  ({
    available: true,
    name: partial.ieee!,
    lqi: 0,
    rssi: "",
    last_seen: "",
    manufacturer: "",
    model: "",
    quirk_applied: false,
    quirk_class: "",
    entities: [],
    manufacturer_code: 0,
    device_reg_id: partial.ieee!,
    active_coordinator: false,
    signature: {},
    routes: [],
    neighbors: [],
    ...partial,
  }) as ZHADevice;

describe("createZHANetworkChartData", () => {
  it("links a router to its upstream router instead of a nearby child device when routing tables are empty", () => {
    // Regression test: many Zigbee radios (e.g. TI CC2652 via zigpy-znp)
    // never populate Mgmt_Rtg routes, so the chart has to fall back to
    // picking a device's strongest RF neighbor. A router's own child end
    // device (e.g. a plug sitting right next to it) commonly reports a
    // stronger LQI than the router's real uplink, which must not be
    // allowed to hide the backbone connection.
    const coordinator = device({
      ieee: "coordinator",
      device_type: "Coordinator",
      nwk: 0,
    });
    const upstreamRouter = device({
      ieee: "upstream-router",
      device_type: "Router",
      nwk: 1,
      neighbors: [
        { ieee: "coordinator", nwk: "0x0000", lqi: "200", depth: "0", relationship: "Parent" },
      ],
    });
    const downstreamRouter = device({
      ieee: "downstream-router",
      device_type: "Router",
      nwk: 2,
      neighbors: [
        // Real backbone link: weaker signal, correctly flagged as a sibling router
        { ieee: "upstream-router", nwk: "0x0001", lqi: "80", depth: "1", relationship: "Sibling" },
        // Nearby child end device with a much stronger signal than the real uplink
        { ieee: "child-end-device", nwk: "0x0003", lqi: "250", depth: "2", relationship: "Child" },
      ],
    });
    const childEndDevice = device({
      ieee: "child-end-device",
      device_type: "EndDevice",
      nwk: 3,
      neighbors: [
        { ieee: "downstream-router", nwk: "0x0002", lqi: "250", depth: "2", relationship: "Parent" },
      ],
    });

    const { links } = createZHANetworkChartData(
      [coordinator, upstreamRouter, downstreamRouter, childEndDevice],
      hass,
      document.createElement("div")
    );

    const hasLink = (a: string, b: string) =>
      links.some(
        (link) =>
          (link.source === a && link.target === b) ||
          (link.source === b && link.target === a)
      );

    expect(hasLink("downstream-router", "upstream-router")).toBe(true);
    expect(hasLink("downstream-router", "child-end-device")).toBe(false);
  });
});
