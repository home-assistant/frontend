import { mdiHelpNetworkOutline, mdiLeaf, mdiZigbee } from "@mdi/js";
import { getDeviceArea } from "../../../../../common/entity/context/get_device_context";
import type {
  NetworkData,
  NetworkLink,
  NetworkNode,
} from "../../../../../components/chart/ha-network-graph";
import type { DeviceRegistryEntry } from "../../../../../data/device/device_registry";
import type { ZHADevice } from "../../../../../data/zha";
import { ZHADeviceType } from "../../../../../data/zha";
import type { HomeAssistant } from "../../../../../types";

function getLQIWidth(lqi: number): number {
  return lqi > 200 ? 3 : lqi > 100 ? 2 : 1;
}

const RELATIONSHIP_PRIORITY: Record<string, number> = {
  Parent: 0,
  Sibling: 1,
  NoneOfTheAbove: 2,
  Child: 3,
  PreviousChild: 5,
};
const UNKNOWN_RELATIONSHIP_PRIORITY = 4;

// virtual parents are not Zigbee devices, so their ids cannot collide with an IEEE
export const VIRTUAL_PARENT_PREFIX = "virtual_";

// ECharts maps link value onto the edge length range, so the highest LQI
// gives the shortest edge and the tightest pull
const TIGHT_PULL_VALUE = 255;

// Hidden nodes between the coordinator and each virtual parent. Every hop adds
// up to one edge length, which pushes the groups out past the mesh.
export const SPACER_PREFIX = "spacer_";
const SPACER_COUNT = 2;

const iconSymbol = (
  shape: "circle" | "roundRect",
  color: string,
  iconColor: string,
  iconPath: string
): string => {
  const background =
    shape === "circle"
      ? `<circle cx="16" cy="16" r="16" fill="${color.trim()}"/>`
      : `<rect width="32" height="32" rx="6" fill="${color.trim()}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${background}<path transform="translate(6 6) scale(0.8333)" fill="${iconColor}" d="${iconPath}"/></svg>`;
  return `image://data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export function createZHANetworkChartData(
  devices: ZHADevice[],
  hass: HomeAssistant,
  element: Element
): NetworkData {
  const style = getComputedStyle(element);

  const primaryColor = style.getPropertyValue("--primary-color");
  const routerColor = style.getPropertyValue("--cyan-color");
  const endDeviceColor = style.getPropertyValue("--teal-color");
  const greenPowerColor = style.getPropertyValue("--green-color");
  const offlineColor = style.getPropertyValue("--error-color");
  const iconColor = style.getPropertyValue("--text-primary-color").trim();
  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  const categories = [
    {
      name: hass.localize("ui.panel.config.zha.visualization.coordinator"),
      symbol: "roundRect",
      itemStyle: { color: primaryColor },
    },
    {
      name: hass.localize("ui.panel.config.zha.visualization.router"),
      symbol: "circle",
      itemStyle: { color: routerColor },
    },
    {
      name: hass.localize("ui.panel.config.zha.visualization.end_device"),
      symbol: "circle",
      itemStyle: { color: endDeviceColor },
    },
    {
      name: hass.localize("ui.panel.config.zha.visualization.green_power"),
      symbol: "triangle",
      itemStyle: { color: greenPowerColor },
    },
    {
      name: hass.localize("ui.panel.config.zha.visualization.offline"),
      symbol: "circle",
      itemStyle: { color: offlineColor },
    },
  ];

  // Create all the nodes and links
  devices.forEach((device) => {
    const isCoordinator = device.device_type === ZHADeviceType.Coordinator;
    const isGreenPower = device.device_type === ZHADeviceType.GreenPower;
    let category: number;
    if (!device.available) {
      category = 4; // Offline
    } else if (isCoordinator) {
      category = 0;
    } else if (device.device_type === ZHADeviceType.Router) {
      category = 1;
    } else if (isGreenPower) {
      category = 3;
    } else {
      category = 2; // End Device
    }

    const haDevice = hass.devices[device.device_reg_id] as
      DeviceRegistryEntry | undefined;
    const area = haDevice
      ? getDeviceArea(haDevice, hass.areas, hass.devices)
      : undefined;
    // Create node
    nodes.push({
      id: device.ieee,
      name: device.user_given_name || device.name || device.ieee,
      context: area?.name,
      category,
      value: isCoordinator
        ? 3
        : device.device_type === ZHADeviceType.Router
          ? 2
          : 1,
      symbolSize: isCoordinator
        ? 40
        : device.device_type === ZHADeviceType.Router
          ? 30
          : 20,
      symbol: isCoordinator
        ? iconSymbol("roundRect", primaryColor, iconColor, mdiZigbee)
        : isGreenPower
          ? "triangle"
          : "circle",
      itemStyle: {
        color: device.available
          ? isCoordinator
            ? primaryColor
            : device.device_type === ZHADeviceType.Router
              ? routerColor
              : isGreenPower
                ? greenPowerColor
                : endDeviceColor
          : offlineColor,
      },
      polarDistance: category === 0 ? 0 : category === 1 ? 0.5 : 0.9,
      fixed: isCoordinator,
    });

    // Create links (edges)
    const existingLinks = links.filter(
      (link) => link.source === device.ieee || link.target === device.ieee
    );
    if (device.routes && device.routes.length > 0) {
      device.routes.forEach((route) => {
        const neighbor = device.neighbors.find((n) => n.nwk === route.next_hop);
        if (!neighbor) {
          return;
        }
        const existingLink = existingLinks.find(
          (link) =>
            link.source === neighbor.ieee || link.target === neighbor.ieee
        );

        if (existingLink) {
          if (existingLink.source === device.ieee) {
            existingLink.value = Math.max(
              existingLink.value!,
              parseInt(neighbor.lqi)
            );
          } else {
            existingLink.reverseValue = Math.max(
              existingLink.reverseValue ?? 0,
              parseInt(neighbor.lqi)
            );
          }
          const width = getLQIWidth(parseInt(neighbor.lqi));
          existingLink.symbolSize = (width / 4) * 6 + 3; // range 3-9
          existingLink.lineStyle = {
            ...existingLink.lineStyle,
            width,
            color:
              route.route_status === "Active"
                ? primaryColor
                : existingLink.lineStyle!.color,
            type: ["Child", "Parent"].includes(neighbor.relationship)
              ? "solid"
              : existingLink.lineStyle!.type,
          };
        } else {
          // Create a new link
          const width = getLQIWidth(parseInt(neighbor.lqi));
          const link: NetworkLink = {
            source: device.ieee,
            target: neighbor.ieee,
            value: parseInt(neighbor.lqi),
            lineStyle: {
              width,
              color:
                route.route_status === "Active"
                  ? primaryColor
                  : style.getPropertyValue("--dark-primary-color"),
              type: ["Child", "Parent"].includes(neighbor.relationship)
                ? "solid"
                : "dotted",
            },
            symbolSize: (width / 4) * 6 + 3, // range 3-9
            // By default, all links should be ignored for force layout
            // unless it's a route to the coordinator
            ignoreForceLayout: route.dest_nwk !== "0x0000",
          };
          links.push(link);
          existingLinks.push(link);
        }
      });
    }
  });

  // For every device whose routing table was empty (so it got no link
  // above), independently compute its preferred fallback neighbor before
  // creating any of these links. Doing this device-by-device while
  // creating links (as before) meant whichever device the backend happens
  // to list first "claims" the connection, and a sibling router listed
  // later never gets to contribute its own — often better — choice,
  // splitting the graph into islands depending on backend device order.
  const fallbackTargets = new Map<string, { ieee: string; lqi: string }>();
  devices.forEach((device) => {
    // Green Power devices have no parent, they go under a virtual parent below
    if (device.device_type === ZHADeviceType.GreenPower) {
      return;
    }
    const hasLink = links.some(
      (link) => link.source === device.ieee || link.target === device.ieee
    );
    if (hasLink) {
      return;
    }
    const neighbors: { ieee: string; lqi: string; relationship?: string }[] =
      device.neighbors ?? [];
    if (neighbors.length === 0) {
      // If there are no neighbors, look for links from other devices
      devices.forEach((d) => {
        if (d.neighbors && d.neighbors.length > 0) {
          const neighbor = d.neighbors.find((n) => n.ieee === device.ieee);
          if (neighbor) {
            neighbors.push({ ieee: d.ieee, lqi: neighbor.lqi });
          }
        }
      });
    }
    // Prefer a neighbor the device's own Zigbee stack reports as its
    // parent: picking by raw LQI alone regularly favors a nearby child end
    // device (e.g. a plug sitting right next to its router) over the
    // router's actual uplink, which severs it from the rest of the mesh in
    // the visualization even though the real network is connected.
    const closestNeighbor = neighbors.sort((a, b) => {
      const aPriority =
        RELATIONSHIP_PRIORITY[a.relationship ?? ""] ??
        UNKNOWN_RELATIONSHIP_PRIORITY;
      const bPriority =
        RELATIONSHIP_PRIORITY[b.relationship ?? ""] ??
        UNKNOWN_RELATIONSHIP_PRIORITY;
      const priorityDiff = aPriority - bPriority;
      return priorityDiff !== 0
        ? priorityDiff
        : parseInt(b.lqi) - parseInt(a.lqi);
    })[0];
    if (closestNeighbor) {
      fallbackTargets.set(device.ieee, closestNeighbor);
    }
  });

  const addedFallbackPairs = new Set<string>();
  fallbackTargets.forEach((target, ieee) => {
    const pairKey = [ieee, target.ieee].sort().join("|");
    if (addedFallbackPairs.has(pairKey)) {
      return;
    }
    addedFallbackPairs.add(pairKey);
    links.push({
      source: ieee,
      target: target.ieee,
      value: parseInt(target.lqi),
      symbolSize: 5,
      lineStyle: {
        width: 1,
        color: style.getPropertyValue("--dark-primary-color"),
        type: "dotted",
      },
      ignoreForceLayout: true,
    });
  });

  // Group devices that are still unlinked under a virtual parent, so they
  // gather in one place instead of floating around the graph
  const virtualParents = {
    green_power: {
      color: greenPowerColor,
      icon: mdiLeaf,
      category: 3,
    },
    no_parent: {
      color: style.getPropertyValue("--disabled-color"),
      icon: mdiHelpNetworkOutline,
      category: undefined,
    },
  };
  const virtualChildren: Record<keyof typeof virtualParents, string[]> = {
    green_power: [],
    no_parent: [],
  };
  devices.forEach((device) => {
    if (device.device_type === ZHADeviceType.Coordinator) {
      return;
    }
    if (device.device_type === ZHADeviceType.GreenPower) {
      virtualChildren.green_power.push(device.ieee);
      return;
    }
    const hasLink = links.some(
      (link) => link.source === device.ieee || link.target === device.ieee
    );
    if (!hasLink) {
      virtualChildren.no_parent.push(device.ieee);
    }
  });
  const coordinator = devices.find(
    (device) => device.device_type === ZHADeviceType.Coordinator
  )!;
  (Object.keys(virtualParents) as (keyof typeof virtualParents)[]).forEach(
    (key) => {
      if (!virtualChildren[key].length) {
        return;
      }
      const { color, icon, category } = virtualParents[key];
      const id = `${VIRTUAL_PARENT_PREFIX}${key}`;
      nodes.push({
        id,
        name: hass.localize(`ui.panel.config.zha.visualization.${key}`),
        category,
        value: 2,
        symbolSize: 30,
        symbol: iconSymbol("circle", color, iconColor, icon),
        itemStyle: { color },
      });
      // An invisible chain makes each group a far branch of the coordinator,
      // so the groups spread apart instead of drifting off or overlapping the mesh
      const chain = [coordinator.ieee];
      for (let i = 0; i < SPACER_COUNT; i++) {
        const spacerId = `${SPACER_PREFIX}${key}_${i}`;
        nodes.push({
          id: spacerId,
          value: 1,
          symbolSize: 1,
          itemStyle: { opacity: 0 },
          label: { show: false },
        });
        chain.push(spacerId);
      }
      chain.push(id);
      for (let i = 1; i < chain.length; i++) {
        links.push({
          source: chain[i - 1],
          target: chain[i],
          value: 0,
          symbol: "none",
          lineStyle: { opacity: 0 },
        });
      }
      virtualChildren[key].forEach((ieee) => {
        // not a radio link, so no LQI and no arrow
        links.push({
          source: id,
          target: ieee,
          value: TIGHT_PULL_VALUE,
          symbol: "none",
          lineStyle: { width: 1, color, type: "dashed" },
        });
      });
    }
  );

  // Now set ignoreForceLayout to false for the best connection of each device
  // Except for the coordinator which can have multiple strong connections
  devices.forEach((device) => {
    if (device.device_type === ZHADeviceType.Coordinator) {
      links.forEach((link) => {
        if (link.source === device.ieee || link.target === device.ieee) {
          link.ignoreForceLayout = false;
        }
      });
    } else {
      // Find the link that corresponds to this strongest connection
      let bestLink: NetworkLink | undefined;
      const alreadyHasBestLink = links.some((link) => {
        if (link.source === device.ieee || link.target === device.ieee) {
          if (!link.ignoreForceLayout) {
            return true;
          }
          if (link.value! > (bestLink?.value ?? -1)) {
            bestLink = link;
          }
        }
        return false;
      });

      if (!alreadyHasBestLink && bestLink) {
        bestLink.ignoreForceLayout = false;
      }
    }
  });

  return { nodes, links, categories };
}
