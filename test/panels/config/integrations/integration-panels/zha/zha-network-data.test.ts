import { describe, expect, it } from "vitest";
import { createZHANetworkChartData } from "../../../../../../src/panels/config/integrations/integration-panels/zha/zha-network-data";
import type { ZHADevice } from "../../../../../../src/data/zha";
import type { HomeAssistant } from "../../../../../../src/types";

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
        {
          ieee: "coordinator",
          nwk: "0x0000",
          lqi: "200",
          depth: "0",
          relationship: "Parent",
        },
      ],
    });
    const downstreamRouter = device({
      ieee: "downstream-router",
      device_type: "Router",
      nwk: 2,
      neighbors: [
        // Real backbone link: weaker signal, correctly flagged as a sibling router
        {
          ieee: "upstream-router",
          nwk: "0x0001",
          lqi: "80",
          depth: "1",
          relationship: "Sibling",
        },
        // Nearby child end device with a much stronger signal than the real uplink
        {
          ieee: "child-end-device",
          nwk: "0x0003",
          lqi: "250",
          depth: "2",
          relationship: "Child",
        },
      ],
    });
    const childEndDevice = device({
      ieee: "child-end-device",
      device_type: "EndDevice",
      nwk: 3,
      neighbors: [
        {
          ieee: "downstream-router",
          nwk: "0x0002",
          lqi: "250",
          depth: "2",
          relationship: "Parent",
        },
      ],
    });

    const { links } = createZHANetworkChartData(
      [coordinator, upstreamRouter, downstreamRouter, childEndDevice],
      hass,
      document.createElement("div")
    );

    const adjacency = new Map<string, string[]>();
    for (const link of links) {
      adjacency.set(link.source, [
        ...(adjacency.get(link.source) ?? []),
        link.target,
      ]);
      adjacency.set(link.target, [
        ...(adjacency.get(link.target) ?? []),
        link.source,
      ]);
    }

    // Every device should be reachable from the coordinator. Before the
    // fix, downstream-router picked its child as its only link, leaving
    // it (and its children) as a disconnected island in the chart even
    // though the real network is fully connected.
    const reachable = new Set(["coordinator"]);
    const queue = ["coordinator"];
    while (queue.length) {
      const current = queue.shift()!;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!reachable.has(neighbor)) {
          reachable.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    expect(reachable.has("upstream-router")).toBe(true);
    expect(reachable.has("downstream-router")).toBe(true);
    expect(reachable.has("child-end-device")).toBe(true);
  });

  it("ranks NoneOfTheAbove above Child, and treats unrecognized relationships as better than PreviousChild", () => {
    const router = device({
      ieee: "router",
      device_type: "Router",
      nwk: 1,
      neighbors: [
        {
          ieee: "n-child",
          nwk: "0x0001",
          lqi: "100",
          depth: "1",
          relationship: "Child",
        },
        {
          ieee: "n-none-of-the-above",
          nwk: "0x0002",
          lqi: "100",
          depth: "1",
          relationship: "NoneOfTheAbove",
        },
      ],
    });
    const unknownRelationship = device({
      ieee: "router-2",
      device_type: "Router",
      nwk: 2,
      neighbors: [
        {
          ieee: "n-unrecognized",
          nwk: "0x0003",
          lqi: "100",
          depth: "1",
          relationship: "SomeFutureValue",
        },
        {
          ieee: "n-previous-child",
          nwk: "0x0004",
          lqi: "100",
          depth: "1",
          relationship: "PreviousChild",
        },
      ],
    });

    const { links } = createZHANetworkChartData(
      [router, unknownRelationship],
      hass,
      document.createElement("div")
    );

    const otherEndOf = (ieee: string) => {
      const link = links.find((l) => l.source === ieee || l.target === ieee);
      return link?.source === ieee ? link.target : link?.source;
    };

    expect(otherEndOf("router")).toBe("n-none-of-the-above");
    expect(otherEndOf("router-2")).toBe("n-unrecognized");
  });

  it("connects every device regardless of backend device order (child listed before its parent router)", () => {
    // Regression test for a subtler variant of the same bug: the fallback
    // link is only computed for a device if it doesn't already have a
    // link. If the backend lists a child end device before its parent
    // router, the child claims the link first, and the router - now
    // appearing to "already have a link" - never gets to evaluate its own
    // (better) neighbor choice, splitting the graph exactly as before but
    // triggered by device order instead of by LQI.
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
        {
          ieee: "coordinator",
          nwk: "0x0000",
          lqi: "200",
          depth: "0",
          relationship: "Parent",
        },
      ],
    });
    const downstreamRouter = device({
      ieee: "downstream-router",
      device_type: "Router",
      nwk: 2,
      neighbors: [
        {
          ieee: "upstream-router",
          nwk: "0x0001",
          lqi: "80",
          depth: "1",
          relationship: "Sibling",
        },
        {
          ieee: "child-end-device",
          nwk: "0x0003",
          lqi: "250",
          depth: "2",
          relationship: "Child",
        },
      ],
    });
    const childEndDevice = device({
      ieee: "child-end-device",
      device_type: "EndDevice",
      nwk: 3,
      neighbors: [
        {
          ieee: "downstream-router",
          nwk: "0x0002",
          lqi: "250",
          depth: "2",
          relationship: "Parent",
        },
      ],
    });

    // Same topology as the first test, but the child is listed before its
    // parent router this time.
    const { links } = createZHANetworkChartData(
      [coordinator, upstreamRouter, childEndDevice, downstreamRouter],
      hass,
      document.createElement("div")
    );

    const adjacency = new Map<string, string[]>();
    for (const link of links) {
      adjacency.set(link.source, [
        ...(adjacency.get(link.source) ?? []),
        link.target,
      ]);
      adjacency.set(link.target, [
        ...(adjacency.get(link.target) ?? []),
        link.source,
      ]);
    }

    const reachable = new Set(["coordinator"]);
    const queue = ["coordinator"];
    while (queue.length) {
      const current = queue.shift()!;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!reachable.has(neighbor)) {
          reachable.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    expect(reachable.has("upstream-router")).toBe(true);
    expect(reachable.has("downstream-router")).toBe(true);
    expect(reachable.has("child-end-device")).toBe(true);
  });
});
