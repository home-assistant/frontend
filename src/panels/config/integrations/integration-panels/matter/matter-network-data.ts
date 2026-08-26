import { getDeviceArea } from "../../../../../common/entity/context/get_device_context";
import type {
  NetworkData,
  NetworkLink,
  NetworkNode,
} from "../../../../../components/chart/ha-network-graph";
import type {
  MatterNetworkTopology,
  MatterNetworkTopologyNode,
  MatterTopologyStrength,
} from "../../../../../data/matter";
import type { HomeAssistant } from "../../../../../types";

const CATEGORY_HOME_ASSISTANT = 0;
const CATEGORY_BORDER_ROUTER = 1;
const CATEGORY_ROUTER = 2;
const CATEGORY_END_DEVICE = 3;
const CATEGORY_WIFI_AP = 4;
const CATEGORY_OFFLINE = 5;
const CATEGORY_UNKNOWN = 6;

const ROUTER_ROLES = new Set(["leader", "router", "reed"]);

// HA is not a Matter node; the frontend synthesizes it as the graph root.
export const HOME_ASSISTANT_NODE_ID = "ha";
const HOME_ASSISTANT_LABEL = "Home Assistant";

// 0 is never returned: a falsy link value re-enables the direction arrow
// in ha-network-graph
export const strengthToScale = (
  strength?: MatterTopologyStrength | null
): number => {
  switch (strength) {
    case "strong":
      return 4;
    case "medium":
      return 3;
    case "weak":
      return 2;
    // "unknown" (no measurement, link presumed up) sits above "none"/dead so it
    // reads as a present link, not a degraded one
    case "unknown":
      return 2;
    default:
      return 1;
  }
};

// links are colored by transport; signal level stays on the line width.
// Both hues clear 3:1 on the light and the dark card background -- named
// palette colors have no dark variant, so a darker pick would vanish.
export const networkToColorVar = (network?: string | null): string => {
  switch (network) {
    case "thread":
      return "--purple-color";
    case "wifi":
      return "--orange-color";
    // `network` is a plain string on the wire: "ethernet" and anything a newer
    // server invents still draw, just neutrally
    default:
      return "--secondary-text-color";
  }
};

const strengthToWidth = (strength?: MatterTopologyStrength | null): number =>
  strength === "strong" ? 3 : strength === "medium" ? 2 : 1;

export const getTopologyNodeCategory = (
  node: MatterNetworkTopologyNode
): number => {
  if (node.kind === "border_router") {
    return CATEGORY_BORDER_ROUTER;
  }
  if (node.kind === "wifi_ap") {
    return CATEGORY_WIFI_AP;
  }
  if (node.kind === "thread_unknown") {
    return CATEGORY_UNKNOWN;
  }
  if (node.available === false) {
    return CATEGORY_OFFLINE;
  }
  return node.role && ROUTER_ROLES.has(node.role)
    ? CATEGORY_ROUTER
    : CATEGORY_END_DEVICE;
};

export const getTopologyNodeName = (
  node: MatterNetworkTopologyNode,
  hass: HomeAssistant
): string => {
  const device = node.ha_device_id
    ? hass.devices[node.ha_device_id]
    : undefined;
  if (device) {
    return device.name_by_user || device.name || node.id;
  }
  if (node.kind === "border_router") {
    return (
      // many vendors report an identical vendor/model pair on every unit
      node.host_name ||
      [node.vendor_name, node.model_name].filter(Boolean).join(" ") ||
      hass.localize("ui.panel.config.matter.visualization.border_router")
    );
  }
  if (node.kind === "wifi_ap") {
    return (
      // the SSID names the network; network_name still holds the BSSID here
      node.ssid ||
      node.network_name ||
      hass.localize("ui.panel.config.matter.visualization.wifi_ap")
    );
  }
  if (node.kind === "thread_unknown") {
    return hass.localize("ui.panel.config.matter.visualization.unknown_device");
  }
  if (node.node_id != null) {
    return hass.localize("ui.panel.config.matter.visualization.node", {
      node_id: node.node_id,
    });
  }
  return node.id;
};

const isHub = (category: number): boolean =>
  category === CATEGORY_BORDER_ROUTER || category === CATEGORY_WIFI_AP;

export function createMatterNetworkChartData(
  topology: MatterNetworkTopology,
  hass: HomeAssistant,
  element: Element
): NetworkData {
  const style = getComputedStyle(element);

  // a hub wears its transport's colour, the same hue as the links behind it
  const categoryColors = [
    style.getPropertyValue("--primary-color"),
    style.getPropertyValue(networkToColorVar("thread")),
    style.getPropertyValue("--cyan-color"),
    style.getPropertyValue("--teal-color"),
    style.getPropertyValue(networkToColorVar("wifi")),
    style.getPropertyValue("--error-color"),
    style.getPropertyValue("--disabled-color"),
  ];
  const categories = [
    {
      name: HOME_ASSISTANT_LABEL,
      symbol: "roundRect",
      itemStyle: { color: categoryColors[CATEGORY_HOME_ASSISTANT] },
    },
    {
      name: hass.localize("ui.panel.config.matter.visualization.border_router"),
      symbol: "roundRect",
      itemStyle: { color: categoryColors[CATEGORY_BORDER_ROUTER] },
    },
    {
      name: hass.localize("ui.panel.config.matter.visualization.router"),
      symbol: "circle",
      itemStyle: { color: categoryColors[CATEGORY_ROUTER] },
    },
    {
      name: hass.localize("ui.panel.config.matter.visualization.end_device"),
      symbol: "circle",
      itemStyle: { color: categoryColors[CATEGORY_END_DEVICE] },
    },
    {
      name: hass.localize("ui.panel.config.matter.visualization.wifi_ap"),
      symbol: "roundRect",
      itemStyle: { color: categoryColors[CATEGORY_WIFI_AP] },
    },
    {
      name: hass.localize("ui.panel.config.matter.visualization.offline"),
      symbol: "circle",
      itemStyle: { color: categoryColors[CATEGORY_OFFLINE] },
    },
    {
      name: hass.localize(
        "ui.panel.config.matter.visualization.unknown_devices"
      ),
      symbol: "circle",
      itemStyle: { color: categoryColors[CATEGORY_UNKNOWN] },
    },
  ];

  const threadNetworks = new Set(
    topology.nodes.map((node) => node.ext_pan_id).filter(Boolean)
  );
  const multiNetwork = threadNetworks.size > 1;

  const nodes: NetworkNode[] = [
    {
      id: HOME_ASSISTANT_NODE_ID,
      name: HOME_ASSISTANT_LABEL,
      category: CATEGORY_HOME_ASSISTANT,
      value: 4,
      symbol: "roundRect",
      symbolSize: 45,
      polarDistance: 0,
      fixed: true,
      itemStyle: { color: categoryColors[CATEGORY_HOME_ASSISTANT] },
    },
  ];
  const nodeCategories = new Map<string, number>();
  topology.nodes.forEach((node) => {
    const category = getTopologyNodeCategory(node);
    nodeCategories.set(node.id, category);
    const device = node.ha_device_id
      ? hass.devices[node.ha_device_id]
      : undefined;
    const area = device
      ? getDeviceArea(device, hass.areas, hass.devices)
      : undefined;
    const name = getTopologyNodeName(node, hass);
    // an AP is named by its SSID, so its own radio address is what tells two
    // radios of one mesh apart; everything else is named by its network
    const networkLabel =
      node.kind === "wifi_ap"
        ? node.bssid || node.network_name
        : node.ssid || node.network_name;
    const contextParts: string[] = [];
    if (area) {
      contextParts.push(area.name);
    }
    // skip a label that just repeats the name, e.g. an AP with no SSID
    if ((multiNetwork || !area) && networkLabel && networkLabel !== name) {
      contextParts.push(networkLabel);
    }
    nodes.push({
      id: node.id,
      name,
      context: contextParts.join(" • ") || undefined,
      category,
      value: isHub(category) ? 3 : category === CATEGORY_ROUTER ? 2 : 1,
      symbol: isHub(category) ? "roundRect" : "circle",
      symbolSize: isHub(category) ? 40 : category === CATEGORY_ROUTER ? 30 : 20,
      itemStyle: {
        color: categoryColors[category],
        ...(node.role === "leader"
          ? {
              borderColor: style.getPropertyValue("--primary-color"),
              borderWidth: 2,
            }
          : {}),
      },
      polarDistance: isHub(category)
        ? 0.1
        : category === CATEGORY_ROUTER
          ? 0.4
          : 0.8,
    });
  });

  const links: NetworkLink[] = [];
  topology.connections.forEach((conn) => {
    if (!nodeCategories.has(conn.source) || !nodeCategories.has(conn.target)) {
      return;
    }
    // the summary strength is the strongest observed direction, so "none" means
    // every direction is dead -- a stale neighbour entry the dashboard also
    // refuses to draw
    if (conn.strength === "none") {
      return;
    }
    let { source, target } = conn;
    let forward = conn.source_to_target;
    let reverse = conn.target_to_source;
    if (!forward && reverse) {
      // normalize so the arrow points in the observed direction
      [source, target] = [target, source];
      forward = reverse;
      reverse = undefined;
    }
    const oneWay = Boolean(forward) && !reverse;
    const asymmetric =
      forward && reverse && forward.strength !== reverse.strength;
    // an edge is lower confidence when an endpoint is inferred rather than
    // commissioned, or is offline -- the dashboard dashes on the same two
    const lowConfidence = [source, target].some((id) => {
      const category = nodeCategories.get(id);
      return category === CATEGORY_UNKNOWN || category === CATEGORY_OFFLINE;
    });
    const width = strengthToWidth(conn.strength);
    links.push({
      source,
      target,
      value: strengthToScale(forward?.strength ?? conn.strength),
      // route-table edges without per-direction info are not directional
      reverseValue: oneWay
        ? undefined
        : strengthToScale(reverse?.strength ?? conn.strength),
      symbolSize: oneWay ? width * 2 + 3 : undefined,
      lineStyle: {
        width,
        color: style.getPropertyValue(networkToColorVar(conn.network)),
        type:
          oneWay || asymmetric || lowConfidence
            ? "dashed"
            : !forward && conn.via_route_table
              ? "dotted"
              : "solid",
      },
      ignoreForceLayout: !(
        isHub(nodeCategories.get(source)!) || isHub(nodeCategories.get(target)!)
      ),
    });
  });

  // Only a hub gets an edge to HA, and it is a real path. A node whose route we
  // cannot see gets nothing: inventing an edge to HA reads as a physical link.
  // It keeps the HA node's own color rather than a transport hue.
  // `symbol: "none"` is what keeps the arrowhead off these edges -- ha-network-graph
  // keys arrow suppression on `reverseValue`, not on `value` -- so it must stay.
  const haLink = (target: string, network: string): NetworkLink => ({
    source: HOME_ASSISTANT_NODE_ID,
    target,
    value: 0,
    symbol: "none",
    lineStyle: {
      width: 3,
      // the same hue as the radio links behind this hub, so one transport
      // reads as one colour all the way back to Home Assistant
      color: style.getPropertyValue(networkToColorVar(network)),
      type: "solid",
    },
  });

  // HA reaches the mesh through the border routers and Wi-Fi access points
  topology.nodes
    .filter((node) => node.kind === "border_router" || node.kind === "wifi_ap")
    .forEach((node) =>
      links.push(haLink(node.id, node.kind === "wifi_ap" ? "wifi" : "thread"))
    );

  // keep the strongest link of every node in the force layout so
  // nodes hang near their best connection instead of floating free
  nodes.forEach((node) => {
    let bestLink: NetworkLink | undefined;
    const hasActiveLink = links.some((link) => {
      if (link.source !== node.id && link.target !== node.id) {
        return false;
      }
      if (!link.ignoreForceLayout) {
        return true;
      }
      const linkValue = Math.max(link.value ?? 0, link.reverseValue ?? 0);
      if (
        linkValue >
        Math.max(bestLink?.value ?? -1, bestLink?.reverseValue ?? -1)
      ) {
        bestLink = link;
      }
      return false;
    });
    if (!hasActiveLink && bestLink) {
      bestLink.ignoreForceLayout = false;
    }
  });

  return { nodes, links, categories };
}
