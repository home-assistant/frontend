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

const CATEGORY_BORDER_ROUTER = 0;
const CATEGORY_ROUTER = 1;
const CATEGORY_END_DEVICE = 2;
const CATEGORY_WIFI_AP = 3;
const CATEGORY_OFFLINE = 4;
const CATEGORY_UNKNOWN = 5;

const ROUTER_ROLES = new Set(["leader", "router", "reed"]);

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
    default:
      return 1;
  }
};

export const strengthToColorVar = (
  strength?: MatterTopologyStrength | null
): string => {
  switch (strength) {
    case "strong":
      return "--success-color";
    case "medium":
      return "--warning-color";
    case "weak":
      return "--error-color";
    default:
      return "--disabled-color";
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
      [node.vendor_name, node.model_name].filter(Boolean).join(" ") ||
      hass.localize("ui.panel.config.matter.visualization.border_router")
    );
  }
  if (node.kind === "wifi_ap") {
    return (
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

  const categoryColors = [
    style.getPropertyValue("--primary-color"),
    style.getPropertyValue("--cyan-color"),
    style.getPropertyValue("--teal-color"),
    style.getPropertyValue("--indigo-color"),
    style.getPropertyValue("--error-color"),
    style.getPropertyValue("--disabled-color"),
  ];
  const categories = [
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

  const nodes: NetworkNode[] = [];
  const nodeCategories = new Map<string, number>();
  topology.nodes.forEach((node) => {
    const category = getTopologyNodeCategory(node);
    nodeCategories.set(node.id, category);
    const device = node.ha_device_id
      ? hass.devices[node.ha_device_id]
      : undefined;
    const area = device ? getDeviceArea(device, hass.areas) : undefined;
    const contextParts: string[] = [];
    if (area) {
      contextParts.push(area.name);
    }
    if ((multiNetwork || !area) && node.network_name) {
      contextParts.push(node.network_name);
    }
    nodes.push({
      id: node.id,
      name: getTopologyNodeName(node, hass),
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
        color: style.getPropertyValue(strengthToColorVar(conn.strength)),
        type:
          oneWay || asymmetric
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
