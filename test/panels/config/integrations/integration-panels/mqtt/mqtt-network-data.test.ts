import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NetworkData } from "../../../../../../src/components/chart/ha-network-graph";
import type { MQTTExplorerStructure } from "../../../../../../src/data/mqtt";
import { createMQTTNetworkChartData } from "../../../../../../src/panels/config/integrations/integration-panels/mqtt/mqtt-network-data";
import type { HomeAssistant } from "../../../../../../src/types";

// The localize stub returns the key, so the legend names are the keys
const category = (key: string) => `ui.panel.config.mqtt.visualization.${key}`;
const DEFAULT_HIDDEN = [
  category("entity"),
  category("artifact_device_trigger"),
  category("artifact_tag"),
];

const HUB = "device:hub";
const CHILD = "device:child";
const HUB_ENTITY = "entity:sensor.hub_temperature";
const CHILD_ENTITY = "entity:sensor.child_humidity";
const TRIGGER = "artifact:device_trigger:hub_button";

const STRUCTURE: MQTTExplorerStructure = {
  broker: { connected: true, host: "localhost", port: 1883 },
  sources: [
    { id: "origin:Z2M", type: "discovery", title: "Z2M", sw_version: null },
  ],
  devices: [
    {
      device_id: "hub",
      name: "Hub",
      sources: ["origin:Z2M"],
      via_device_id: null,
      child_device: false,
    },
    {
      device_id: "child",
      name: "Child",
      sources: ["origin:Z2M"],
      via_device_id: "hub",
      child_device: true,
    },
  ],
  entities: [
    {
      entity_id: "sensor.hub_temperature",
      name: "Temperature",
      available: true,
      source: "origin:Z2M",
      device_id: "hub",
      node_id: null,
      topics: [{ topic: "z2m/hub", direction: "subscribe", qos: 0 }],
    },
    {
      entity_id: "sensor.child_humidity",
      name: "Humidity",
      available: true,
      source: "origin:Z2M",
      device_id: "child",
      node_id: null,
      topics: [{ topic: "z2m/child/humidity", direction: "subscribe", qos: 0 }],
    },
  ],
  artifacts: [
    {
      artifact_id: "device_trigger:hub_button",
      type: "device_trigger",
      source: "origin:Z2M",
      device_id: "hub",
      node_id: null,
      topics: [{ topic: "z2m/hub/action", direction: "subscribe", qos: 0 }],
    },
  ],
};

const HASS = { localize: (key: string) => key } as unknown as HomeAssistant;

interface Scenario {
  focusedNode?: string;
  searchFilter?: string;
  hiddenCategories: string[];
}

const chartData = (scenario: Scenario, treeLayout = false) =>
  createMQTTNetworkChartData(
    STRUCTURE,
    HASS,
    {} as Element,
    false,
    [],
    scenario.focusedNode,
    scenario.searchFilter,
    scenario.hiddenCategories,
    treeLayout
  );

// The IDs of the nodes the legend shows: a node without a category always shows
const shownNodeIds = (data: NetworkData, hiddenCategories: string[]) =>
  data.nodes
    .filter(
      (node) =>
        node.category === undefined ||
        !hiddenCategories.includes(data.categories![node.category].name)
    )
    .map((node) => node.id);

const SCENARIOS = {
  default_legend: { hiddenCategories: DEFAULT_HIDDEN },
  focused_device: { focusedNode: HUB, hiddenCategories: DEFAULT_HIDDEN },
  search_in_hidden_category: {
    searchFilter: "humidity",
    hiddenCategories: DEFAULT_HIDDEN,
  },
  hidden_child_device_with_match_below: {
    searchFilter: "humidity",
    hiddenCategories: [...DEFAULT_HIDDEN, category("child_device")],
  },
} satisfies Record<string, Scenario>;

describe("createMQTTNetworkChartData", () => {
  beforeEach(() => {
    vi.stubGlobal("getComputedStyle", () => ({
      getPropertyValue: () => "#808080",
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    {
      name: "default_legend",
      shown: ["broker", "source:origin:Z2M", HUB, CHILD],
    },
    {
      name: "focused_device",
      // The child device's own items stay hidden
      shown: ["broker", "source:origin:Z2M", HUB, CHILD, HUB_ENTITY, TRIGGER],
    },
    {
      name: "search_in_hidden_category",
      shown: ["broker", "source:origin:Z2M", HUB, CHILD, CHILD_ENTITY],
    },
    {
      name: "hidden_child_device_with_match_below",
      // The hidden child device stays, so the match keeps its link
      shown: ["broker", "source:origin:Z2M", HUB, CHILD, CHILD_ENTITY],
    },
  ] as const)("shows the right nodes: $name", ({ name, shown }) => {
    const scenario = SCENARIOS[name];
    expect(
      shownNodeIds(chartData(scenario), scenario.hiddenCategories).sort()
    ).toEqual([...shown].sort());
  });

  it.each(Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[])(
    "links every shown node to a shown parent: %s",
    (name) => {
      const scenario = SCENARIOS[name];
      const data = chartData(scenario);
      const nodeIds = new Set(data.nodes.map((node) => node.id));
      for (const link of data.links) {
        expect(nodeIds).toContain(link.source);
        expect(nodeIds).toContain(link.target);
      }
      const shown = new Set(shownNodeIds(data, scenario.hiddenCategories));
      for (const id of shown) {
        if (id !== "broker") {
          expect(
            data.links.some(
              (link) => link.target === id && shown.has(link.source)
            )
          ).toBe(true);
        }
      }
    }
  );

  it.each(Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[])(
    "gives each shown node its own place in the tree: %s",
    (name) => {
      const scenario = SCENARIOS[name];
      const data = chartData(scenario, true);
      const shown = new Set(shownNodeIds(data, scenario.hiddenCategories));
      const places = data.nodes
        .filter((node) => shown.has(node.id))
        .map((node) => `${node.x},${node.y}`);
      expect(new Set(places).size).toBe(places.length);
    }
  );

  it("folds a hidden node onto its parent in the tree", () => {
    const data = chartData({ hiddenCategories: DEFAULT_HIDDEN }, true);
    const hub = data.nodes.find((node) => node.id === HUB)!;
    const entity = data.nodes.find((node) => node.id === HUB_ENTITY)!;
    expect(entity.y).toBe(hub.y);
    expect(entity.x).toBeGreaterThan(hub.x!);
  });
});
