import { getDeviceContext } from "../../../../../common/entity/context/get_device_context";
import type {
  NetworkData,
  NetworkLink,
  NetworkNode,
} from "../../../../../components/chart/ha-network-graph";
import type { DeviceRegistryEntry } from "../../../../../data/device/device_registry";
import type { ZHADevice } from "../../../../../data/zha";
import type { HomeAssistant } from "../../../../../types";

function getLQIWidth(lqi: number): number {
  return lqi > 200 ? 3 : lqi > 100 ? 2 : 1;
}

export function createZHANetworkChartData(
  devices: ZHADevice[],
  hass: HomeAssistant,
  element: Element
): NetworkData {
  const style = getComputedStyle(element);

  const primaryColor = style.getPropertyValue("--primary-color");
  const routerColor = style.getPropertyValue("--cyan-color");
  const endDeviceColor = style.getPropertyValue("--teal-color");
  const offlineColor = style.getPropertyValue("--error-color");
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
      name: hass.localize("ui.panel.config.zha.visualization.offline"),
      symbol: "circle",
      itemStyle: { color: offlineColor },
    },
  ];

  // Create all the nodes and links
  devices.forEach((device) => {
    const isCoordinator = device.device_type === "Coordinator";
    let category: number;
    if (!device.available) {
      category = 3; // Offline
    } else if (isCoordinator) {
      category = 0;
    } else if (device.device_type === "Router") {
      category = 1;
    } else {
      category = 2; // End Device
    }

    const haDevice = hass.devices[device.device_reg_id] as
      | DeviceRegistryEntry
      | undefined;
    const area = haDevice ? getDeviceContext(haDevice, hass).area : undefined;
    // Create node
    nodes.push({
      id: device.ieee,
      name: device.user_given_name || device.name || device.ieee,
      context: area?.name,
      category,
      value: isCoordinator ? 3 : device.device_type === "Router" ? 2 : 1,
      symbolSize: isCoordinator
        ? 40
        : device.device_type === "Router"
          ? 30
          : 20,
      symbol: isCoordinator ? "roundRect" : "circle",
      itemStyle: {
        color: device.available
          ? isCoordinator
            ? primaryColor
            : device.device_type === "Router"
              ? routerColor
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
    } else if (existingLinks.length === 0) {
      // If there are no links, create a link to the closest neighbor
      const neighbors: { ieee: string; lqi: string }[] = device.neighbors ?? [];
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
      const closestNeighbor = neighbors.sort(
        (a, b) => parseInt(b.lqi) - parseInt(a.lqi)
      )[0];
      if (closestNeighbor) {
        links.push({
          source: device.ieee,
          target: closestNeighbor.ieee,
          value: parseInt(closestNeighbor.lqi),
          symbolSize: 5,
          lineStyle: {
            width: 1,
            color: style.getPropertyValue("--dark-primary-color"),
            type: "dotted",
          },
          ignoreForceLayout: true,
        });
      }
    }
  });

  // Now set ignoreForceLayout to false for the best connection of each device
  // Except for the coordinator which can have multiple strong connections
  devices.forEach((device) => {
    if (device.device_type === "Coordinator") {
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
