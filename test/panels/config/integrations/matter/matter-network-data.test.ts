import { describe, expect, it } from "vitest";

import type {
  MatterNetworkTopology,
  MatterNetworkTopologyConnection,
  MatterNetworkTopologyNode,
} from "../../../../../src/data/matter";
import {
  createMatterNetworkChartData,
  getTopologyNodeCategory,
  getTopologyNodeName,
  networkToColorVar,
  strengthToScale,
} from "../../../../../src/panels/config/integrations/integration-panels/matter/matter-network-data";
import type { HomeAssistant } from "../../../../../src/types";

const mockHass = (
  devices: Record<string, Partial<HomeAssistant["devices"][string]>> = {},
  areas: Record<string, Partial<HomeAssistant["areas"][string]>> = {}
): HomeAssistant =>
  ({
    localize: (key: string) => key.split(".").pop(),
    devices,
    areas,
  }) as unknown as HomeAssistant;

const node = (
  overrides: Partial<MatterNetworkTopologyNode> & { id: string }
): MatterNetworkTopologyNode => ({
  kind: "matter",
  network_type: "thread",
  ...overrides,
});

const connection = (
  overrides: Partial<MatterNetworkTopologyConnection> & {
    source: string;
    target: string;
  }
): MatterNetworkTopologyConnection => ({
  network: "thread",
  strength: "strong",
  ...overrides,
});

const topology = (
  nodes: MatterNetworkTopologyNode[],
  connections: MatterNetworkTopologyConnection[] = []
): MatterNetworkTopology => ({
  collected_at: 1767888000000,
  nodes,
  connections,
});

const element = document.createElement("div");
document.body.appendChild(element);

// jsdom resolves custom properties set inline, so color lookups can be
// asserted on real values; use a fresh element so nothing leaks into the
// tests that expect the bare element's empty strings
const themedElement = (): HTMLElement => {
  const el = document.createElement("div");
  el.style.setProperty("--primary-color", "#009ac7");
  el.style.setProperty("--purple-color", "#926bc7");
  el.style.setProperty("--pink-color", "#e91e63");
  el.style.setProperty("--disabled-color", "#bdbdbd");
  document.body.appendChild(el);
  return el;
};

describe("strengthToScale", () => {
  it("never returns a falsy value so the graph arrow stays suppressed", () => {
    expect(strengthToScale("strong")).toBe(4);
    expect(strengthToScale("medium")).toBe(3);
    expect(strengthToScale("weak")).toBe(2);
    expect(strengthToScale("none")).toBe(1);
    expect(strengthToScale(undefined)).toBe(1);
    expect(strengthToScale(null)).toBe(1);
  });

  it("renders an unmeasured link as present, above a dead one", () => {
    // "unknown" (no measurement) must not collapse to the "none"/dead bucket
    expect(strengthToScale("unknown")).toBe(2);
    expect(strengthToScale("unknown")).toBeGreaterThan(strengthToScale("none"));
  });
});

describe("networkToColorVar", () => {
  it("separates the two transports and degrades gracefully", () => {
    expect(networkToColorVar("thread")).toBe("--purple-color");
    expect(networkToColorVar("wifi")).toBe("--pink-color");
    expect(networkToColorVar("thread")).not.toBe(networkToColorVar("wifi"));
    // the wire type is a plain string, not a union
    expect(networkToColorVar("ethernet")).toBe("--secondary-text-color");
    expect(networkToColorVar(undefined)).toBe("--secondary-text-color");
  });
});

describe("getTopologyNodeCategory", () => {
  it("maps kinds and roles to categories", () => {
    // category 0 is reserved for the synthesized Home Assistant root node
    expect(
      getTopologyNodeCategory(node({ id: "br", kind: "border_router" }))
    ).toBe(1);
    expect(getTopologyNodeCategory(node({ id: "1", role: "leader" }))).toBe(2);
    expect(getTopologyNodeCategory(node({ id: "2", role: "router" }))).toBe(2);
    expect(getTopologyNodeCategory(node({ id: "3", role: "reed" }))).toBe(2);
    expect(getTopologyNodeCategory(node({ id: "4", role: "end_device" }))).toBe(
      3
    );
    expect(
      getTopologyNodeCategory(node({ id: "5", role: "sleepy_end_device" }))
    ).toBe(3);
    expect(
      getTopologyNodeCategory(
        node({ id: "6", network_type: "wifi", role: "station" })
      )
    ).toBe(3);
    expect(
      getTopologyNodeCategory(
        node({ id: "ap_112233445566", kind: "wifi_ap", network_type: "wifi" })
      )
    ).toBe(4);
    expect(
      getTopologyNodeCategory(
        node({ id: "7", role: "router", available: false })
      )
    ).toBe(5);
    expect(
      getTopologyNodeCategory(node({ id: "unknown_1", kind: "thread_unknown" }))
    ).toBe(6);
  });
});

describe("getTopologyNodeName", () => {
  it("prefers the HA device name", () => {
    const hass = mockHass({
      dev1: { name_by_user: "Living room plug", name: "Plug" },
    });
    expect(
      getTopologyNodeName(
        node({ id: "1", node_id: 1, ha_device_id: "dev1" }),
        hass
      )
    ).toBe("Living room plug");
  });

  it("falls back to wire metadata for external nodes", () => {
    const hass = mockHass();
    expect(
      getTopologyNodeName(
        node({ id: "br_1", kind: "border_router", vendor_name: "Apple" }),
        hass
      )
    ).toBe("Apple");
    expect(
      getTopologyNodeName(
        node({
          id: "ap_112233445566",
          kind: "wifi_ap",
          network_type: "wifi",
          network_name: "MyWiFi",
        }),
        hass
      )
    ).toBe("MyWiFi");
    expect(
      getTopologyNodeName(
        node({ id: "unknown_1", kind: "thread_unknown" }),
        hass
      )
    ).toBe("unknown_device");
  });

  it("prefers the border router hostname over its generic vendor and model", () => {
    // some vendors report the same vendor/model on every unit they ship, so
    // vendor+model alone labels every border router identically
    expect(
      getTopologyNodeName(
        node({
          id: "br_1",
          kind: "border_router",
          host_name: "Cuisine",
          vendor_name: "Apple",
          model_name: "BorderRouter",
        }),
        mockHass()
      )
    ).toBe("Cuisine");
  });

  it("keeps the HA device name ahead of the border router hostname", () => {
    expect(
      getTopologyNodeName(
        node({
          id: "br_1",
          kind: "border_router",
          ha_device_id: "dev1",
          host_name: "Cuisine",
        }),
        mockHass({ dev1: { name: "Kitchen hub" } })
      )
    ).toBe("Kitchen hub");
  });

  it("falls through to vendor and model when host_name is null", () => {
    // core's serializer always emits the key, so null must behave as absent
    expect(
      getTopologyNodeName(
        node({
          id: "br_1",
          kind: "border_router",
          host_name: null,
          vendor_name: "Apple",
          model_name: "BorderRouter",
        }),
        mockHass()
      )
    ).toBe("Apple BorderRouter");
  });

  it("names a Wi-Fi access point by its SSID, not its radio address", () => {
    expect(
      getTopologyNodeName(
        node({
          id: "ap_1",
          kind: "wifi_ap",
          network_type: "wifi",
          ssid: "we@home",
          network_name: "50:91:00:D9:62:00",
        }),
        mockHass()
      )
    ).toBe("we@home");
  });

  it("falls back to the BSSID when the server sends no SSID", () => {
    expect(
      getTopologyNodeName(
        node({
          id: "ap_1",
          kind: "wifi_ap",
          network_type: "wifi",
          ssid: null,
          network_name: "50:91:00:D9:62:00",
        }),
        mockHass()
      )
    ).toBe("50:91:00:D9:62:00");
  });
});

describe("createMatterNetworkChartData", () => {
  it("maps a thread mesh with a border router", () => {
    const hass = mockHass(
      { dev1: { name: "Leader plug", area_id: "living" } },
      { living: { name: "Living room" } }
    );
    const data = createMatterNetworkChartData(
      topology(
        [
          node({ id: "1", node_id: 1, ha_device_id: "dev1", role: "leader" }),
          node({ id: "2", node_id: 2, role: "end_device", available: true }),
          node({ id: "br_1", kind: "border_router", vendor_name: "Apple" }),
        ],
        [
          connection({
            source: "1",
            target: "2",
            strength: "medium",
            source_to_target: { strength: "medium", lqi: 2 },
            target_to_source: { strength: "medium", lqi: 2 },
          }),
          connection({
            source: "1",
            target: "br_1",
            source_to_target: { strength: "strong", lqi: 3 },
            target_to_source: { strength: "strong", lqi: 3 },
          }),
        ]
      ),
      hass,
      element
    );

    expect(data.categories).toHaveLength(7);
    // Home Assistant root + the 3 topology nodes
    expect(data.nodes).toHaveLength(4);

    const ha = data.nodes[0];
    expect(ha.id).toBe("ha");
    expect(ha.category).toBe(0);
    expect(ha.fixed).toBe(true);
    expect(ha.polarDistance).toBe(0);

    const leader = data.nodes.find((n) => n.id === "1")!;
    expect(leader.name).toBe("Leader plug");
    expect(leader.context).toBe("Living room");
    expect(leader.category).toBe(2);
    expect(leader.itemStyle?.borderWidth).toBe(2);

    const endDevice = data.nodes.find((n) => n.id === "2")!;
    expect(endDevice.category).toBe(3);
    expect(endDevice.itemStyle?.borderWidth).toBeUndefined();

    const borderRouter = data.nodes.find((n) => n.id === "br_1")!;
    expect(borderRouter.category).toBe(1);
    expect(borderRouter.symbol).toBe("roundRect");

    const meshLink = data.links.find(
      (l) => l.source === "1" && l.target === "2"
    )!;
    expect(meshLink.value).toBe(3);
    expect(meshLink.reverseValue).toBe(3);
    expect(meshLink.lineStyle?.type).toBe("solid");

    // HA anchors to the border router (the mesh's infrastructure), not to
    // the individual routers hanging off it
    const haLink = data.links.find((l) => l.source === "ha")!;
    expect(haLink.target).toBe("br_1");
    expect(haLink.symbol).toBe("none");
    expect(data.links.filter((l) => l.source === "ha")).toHaveLength(1);
  });

  it("marks asymmetric links dashed and keeps one-way arrows", () => {
    const data = createMatterNetworkChartData(
      topology(
        [
          node({ id: "1", node_id: 1, role: "router" }),
          node({ id: "2", node_id: 2, role: "router" }),
          node({ id: "3", node_id: 3, role: "router" }),
        ],
        [
          connection({
            source: "1",
            target: "2",
            source_to_target: { strength: "strong", lqi: 3 },
            target_to_source: { strength: "weak", lqi: 1 },
          }),
          // only observed from node 3's side: 3 → 2
          connection({
            source: "2",
            target: "3",
            strength: "medium",
            target_to_source: { strength: "medium", lqi: 2 },
          }),
        ]
      ),
      mockHass(),
      element
    );

    const asymmetric = data.links.find(
      (l) => l.source === "1" && l.target === "2"
    )!;
    expect(asymmetric.lineStyle?.type).toBe("dashed");
    expect(asymmetric.value).toBe(4);
    expect(asymmetric.reverseValue).toBe(2);

    // one-way link is flipped so the arrow points the observed direction
    const oneWay = data.links.find(
      (l) => l.source === "3" && l.target === "2"
    )!;
    expect(oneWay.reverseValue).toBeUndefined();
    expect(oneWay.symbolSize).toBeGreaterThan(0);
    expect(oneWay.lineStyle?.type).toBe("dashed");
  });

  it("suppresses direction arrows on route-table edges", () => {
    const data = createMatterNetworkChartData(
      topology(
        [
          node({ id: "1", node_id: 1, role: "router" }),
          node({ id: "2", node_id: 2, role: "router" }),
        ],
        [
          connection({
            source: "1",
            target: "2",
            strength: "none",
            via_route_table: true,
            path_cost: 1,
          }),
        ]
      ),
      mockHass(),
      element
    );

    const link = data.links[0];
    expect(link.value).toBe(1);
    expect(link.reverseValue).toBe(1);
    expect(link.lineStyle?.type).toBe("dotted");
  });

  it("keeps every node attached to the force layout", () => {
    const data = createMatterNetworkChartData(
      topology(
        [
          node({ id: "1", node_id: 1, role: "router" }),
          node({ id: "2", node_id: 2, role: "router" }),
          node({ id: "3", node_id: 3, role: "end_device" }),
          node({ id: "br_1", kind: "border_router" }),
        ],
        [
          connection({
            source: "1",
            target: "br_1",
            source_to_target: { strength: "strong", lqi: 3 },
            target_to_source: { strength: "strong", lqi: 3 },
          }),
          connection({
            source: "1",
            target: "2",
            strength: "weak",
            source_to_target: { strength: "weak", lqi: 1 },
            target_to_source: { strength: "weak", lqi: 1 },
          }),
          connection({
            source: "2",
            target: "3",
            strength: "weak",
            source_to_target: { strength: "weak", lqi: 1 },
            target_to_source: { strength: "weak", lqi: 1 },
          }),
        ]
      ),
      mockHass(),
      element
    );

    // hub link stays active, and every node has at least one active link
    const hubLink = data.links.find((l) => l.target === "br_1")!;
    expect(hubLink.ignoreForceLayout).toBe(false);
    data.nodes.forEach((n) => {
      const nodeLinks = data.links.filter(
        (l) => l.source === n.id || l.target === n.id
      );
      expect(
        nodeLinks.some((l) => !l.ignoreForceLayout),
        `node ${n.id} has no active link`
      ).toBe(true);
    });
  });

  it("tolerates minimal nodes and skips connections to unknown nodes", () => {
    const data = createMatterNetworkChartData(
      topology(
        [node({ id: "1" })],
        [connection({ source: "1", target: "missing" })]
      ),
      mockHass(),
      element
    );

    // Home Assistant root + the single topology node
    expect(data.nodes).toHaveLength(2);
    // the bogus connection is skipped; the lone node is anchored to HA
    expect(data.links).toHaveLength(1);
    expect(data.links[0].source).toBe("ha");
    expect(data.links[0].target).toBe("1");
  });

  it("anchors unconnected routers directly to Home Assistant", () => {
    const data = createMatterNetworkChartData(
      topology([
        node({ id: "1", node_id: 1, role: "router" }),
        node({ id: "2", node_id: 2, role: "router" }),
      ]),
      mockHass(),
      element
    );

    const haTargets = data.links
      .filter((l) => l.source === "ha")
      .map((l) => l.target)
      .sort();
    expect(haTargets).toEqual(["1", "2"]);
  });

  it("shows an access point's radio address beside its SSID, and never twice", () => {
    const named = createMatterNetworkChartData(
      topology([
        node({
          id: "ap_1",
          kind: "wifi_ap",
          network_type: "wifi",
          ssid: "we@home",
          bssid: "50:91:00:D9:62:00",
          network_name: "50:91:00:D9:62:00",
        }),
      ]),
      mockHass(),
      element
    );
    const ap = named.nodes.find((n) => n.id === "ap_1")!;
    // the radio address is what distinguishes two radios of one mesh
    expect(ap.name).toBe("we@home");
    expect(ap.context).toBe("50:91:00:D9:62:00");

    const unnamed = createMatterNetworkChartData(
      topology([
        node({
          id: "ap_1",
          kind: "wifi_ap",
          network_type: "wifi",
          network_name: "50:91:00:D9:62:00",
        }),
      ]),
      mockHass(),
      element
    );
    const bare = unnamed.nodes.find((n) => n.id === "ap_1")!;
    // without an SSID the name is already the address, so no context repeat
    expect(bare.name).toBe("50:91:00:D9:62:00");
    expect(bare.context).toBeUndefined();
  });

  it("leaves a component of only unknown neighbours unanchored", () => {
    const data = createMatterNetworkChartData(
      topology(
        [
          node({ id: "1", node_id: 1, role: "router" }),
          node({ id: "unknown_1", kind: "thread_unknown" }),
          node({ id: "unknown_2", kind: "thread_unknown" }),
        ],
        [connection({ source: "unknown_1", target: "unknown_2" })]
      ),
      mockHass(),
      element
    );

    // an unknown neighbour is not commissioned on our fabric, so HA has no
    // operational path to it and must not draw one
    const haTargets = data.links
      .filter((l) => l.source === "ha")
      .map((l) => l.target);
    expect(haTargets).toEqual(["1"]);
  });

  it("anchors an unknown neighbour through its known peer, not through HA", () => {
    const data = createMatterNetworkChartData(
      topology(
        [
          node({ id: "1", node_id: 1, role: "router" }),
          node({ id: "unknown_1", kind: "thread_unknown" }),
        ],
        [connection({ source: "1", target: "unknown_1" })]
      ),
      mockHass(),
      element
    );

    // floating the unknowns must not mean dropping them out of a mixed group
    const haTargets = data.links
      .filter((l) => l.source === "ha")
      .map((l) => l.target);
    expect(haTargets).toEqual(["1"]);
    expect(data.nodes.find((n) => n.id === "unknown_1")).toBeDefined();
  });

  it("draws a lone unknown neighbour with no links at all", () => {
    const data = createMatterNetworkChartData(
      topology([node({ id: "unknown_1", kind: "thread_unknown" })]),
      mockHass(),
      element
    );

    expect(data.links).toHaveLength(0);
    // polarDistance is what places an unlinked node in ha-network-graph;
    // at 0 it would stack on the origin instead
    const unknown = data.nodes.find((n) => n.id === "unknown_1")!;
    expect(unknown.polarDistance).toBe(0.8);
  });

  it("colors links by transport, not by signal level", () => {
    const data = createMatterNetworkChartData(
      topology(
        [
          node({ id: "br_1", kind: "border_router" }),
          node({ id: "1", node_id: 1, role: "router" }),
          node({ id: "ap_1", kind: "wifi_ap", network_type: "wifi" }),
          node({ id: "7", node_id: 7, network_type: "wifi", role: "station" }),
        ],
        [
          connection({ source: "1", target: "br_1", strength: "weak" }),
          connection({
            source: "7",
            target: "ap_1",
            network: "wifi",
            strength: "strong",
          }),
        ]
      ),
      mockHass(),
      themedElement()
    );

    // a weak thread link and a strong wi-fi link differ by transport in the
    // color channel and by level in the width channel
    const threadLink = data.links.find((l) => l.source === "1")!;
    const wifiLink = data.links.find((l) => l.source === "7")!;
    expect(threadLink.lineStyle?.color).toBe("#926bc7");
    expect(threadLink.lineStyle?.width).toBe(1);
    expect(wifiLink.lineStyle?.color).toBe("#e91e63");
    expect(wifiLink.lineStyle?.width).toBe(3);

    // the HA spine is reachability, not a radio link, and keeps the HA color
    const spine = data.links.find((l) => l.source === "ha")!;
    expect(spine.lineStyle?.color).toBe("#009ac7");
  });

  it("keeps a dead link grey so it cannot pass for a healthy one", () => {
    const data = createMatterNetworkChartData(
      topology(
        [
          node({ id: "br_1", kind: "border_router" }),
          node({ id: "1", node_id: 1, role: "router" }),
        ],
        [connection({ source: "1", target: "br_1", strength: "none" })]
      ),
      mockHass(),
      themedElement()
    );

    // width cannot carry this: "none", "weak" and "unknown" are all width 1
    const link = data.links.find((l) => l.source === "1")!;
    expect(link.lineStyle?.color).toBe("#bdbdbd");
  });

  it("draws the hub path solid and the position-unknown anchor dotted", () => {
    const data = createMatterNetworkChartData(
      topology(
        [
          node({ id: "br_1", kind: "border_router", host_name: "Cuisine" }),
          node({ id: "1", node_id: 1, role: "router" }),
          node({ id: "9", node_id: 9, role: "router" }),
        ],
        [connection({ source: "1", target: "br_1" })]
      ),
      mockHass(),
      element
    );

    // HA -> border router is a real path
    const hubLink = data.links.find(
      (l) => l.source === "ha" && l.target === "br_1"
    )!;
    expect(hubLink.lineStyle?.type).toBe("solid");

    // HA -> a hubless component's representative only means "reachable,
    // position unknown"
    const orphanLink = data.links.find(
      (l) => l.source === "ha" && l.target === "9"
    )!;
    expect(orphanLink.lineStyle?.type).toBe("dotted");
    // symbol, not the falsy value, is what keeps the arrowhead off
    expect(orphanLink.symbol).toBe("none");
    expect(orphanLink.reverseValue).toBeUndefined();

    // the wire host_name reaches the rendered label, not just the helper
    expect(data.nodes.find((n) => n.id === "br_1")!.name).toBe("Cuisine");
  });

  it("routes HA through the Wi-Fi access point, not the stations", () => {
    const data = createMatterNetworkChartData(
      topology(
        [
          node({
            id: "ap_112233445566",
            kind: "wifi_ap",
            network_type: "wifi",
          }),
          node({ id: "7", node_id: 7, network_type: "wifi", role: "station" }),
          node({ id: "8", node_id: 8, network_type: "wifi", role: "station" }),
        ],
        [
          connection({
            source: "7",
            target: "ap_112233445566",
            network: "wifi",
            source_to_target: { strength: "strong", rssi: -55 },
          }),
          connection({
            source: "8",
            target: "ap_112233445566",
            network: "wifi",
            source_to_target: { strength: "medium", rssi: -70 },
          }),
        ]
      ),
      mockHass(),
      element
    );

    const haTargets = data.links
      .filter((l) => l.source === "ha")
      .map((l) => l.target);
    expect(haTargets).toEqual(["ap_112233445566"]);
  });

  it("adds the network name to the context when there are multiple networks", () => {
    const data = createMatterNetworkChartData(
      topology([
        node({
          id: "1",
          node_id: 1,
          ext_pan_id: "AAA",
          network_name: "NetA",
        }),
        node({
          id: "2",
          node_id: 2,
          ext_pan_id: "BBB",
          network_name: "NetB",
        }),
      ]),
      mockHass(),
      element
    );

    expect(data.nodes.find((n) => n.id === "1")!.context).toBe("NetA");
    expect(data.nodes.find((n) => n.id === "2")!.context).toBe("NetB");
  });
});
