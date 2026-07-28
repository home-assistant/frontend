import { fireEvent } from "../../../../../common/dom/fire_event";
import { getGraphColorByIndex } from "../../../../../common/color/colors";
import { getEntityContext } from "../../../../../common/entity/context/get_entity_context";
import type {
  Link,
  Node,
} from "../../../../../components/chart/ha-sankey-chart";
import type { DeviceConsumptionEnergyPreference } from "../../../../../data/energy";
import type { HomeAssistant } from "../../../../../types";

// Devices below this fraction of the home total are grouped into an "Other" node
export const MIN_SANKEY_THRESHOLD_FACTOR = 0.001; // 0.1% of home total

// While the graph is assembled, device nodes carry an ad-hoc `parent` field
// that is not part of the chart's Node interface. The chart ignores it.
export type SankeyDeviceNode = Node & { parent?: string };

interface SmallConsumer {
  id: string;
  includedInStat: string | undefined;
  name: string | undefined;
  value: number;
  effectiveParent: string | undefined;
  idx: number;
}

const OTHER_LABEL_KEY =
  "ui.panel.lovelace.cards.energy.energy_devices_detail_graph.other";
const UNTRACKED_LABEL_KEY =
  "ui.panel.lovelace.cards.energy.energy_devices_detail_graph.untracked_consumption";

/** Open more-info for a clicked sankey node that maps to an entity. */
export const fireSankeyNodeMoreInfo = (el: HTMLElement, node: Node): void => {
  if (node.entityId) {
    fireEvent(el, "hass-more-info", { entityId: node.entityId });
  }
};

export interface BuildSankeyDeviceNodesOptions {
  devices: DeviceConsumptionEnergyPreference[];
  computedStyle: CSSStyleDeclaration;
  localize: HomeAssistant["localize"];
  /** Node small consumers and untracked flow attach to (usually "home"). */
  rootNodeId: string;
  /** Flows below this value are grouped into an "Other" node. */
  minThreshold: number;
  /** Per-parent untracked residual only shown when above this value. */
  untrackedFloor: number;
  /** Round the "Other" node value up (instantaneous cards only). */
  ceilOtherValue: boolean;
  /** Starting untracked total (the home/root value). */
  initialUntracked: number;
  getId: (device: DeviceConsumptionEnergyPreference) => string | undefined;
  getValue: (id: string) => number;
  getLabel: (id: string, name: string | undefined) => string;
  getEntityId: (id: string) => string | undefined;
}

/**
 * Build the device layer of a sankey card: one node per device, small devices
 * folded into per-parent "Other" nodes, and per-parent untracked residuals.
 * Value/label/id/entityId are supplied via callbacks so both cumulative
 * (statistic growth) and instantaneous (live power/flow) cards can share it.
 */
export const buildSankeyDeviceNodes = (
  options: BuildSankeyDeviceNodesOptions
): {
  deviceNodes: SankeyDeviceNode[];
  parentLinks: Record<string, string>;
  links: Link[];
  untrackedConsumption: number;
} => {
  const {
    devices,
    computedStyle,
    localize,
    rootNodeId,
    minThreshold,
    untrackedFloor,
    ceilOtherValue,
    initialUntracked,
    getId,
    getValue,
    getLabel,
    getEntityId,
  } = options;

  const unavailableColor = computedStyle
    .getPropertyValue("--state-unavailable-color")
    .trim();

  const links: Link[] = [];
  const deviceNodes: SankeyDeviceNode[] = [];
  const parentLinks: Record<string, string> = {};
  const smallConsumersByParent = new Map<string, SmallConsumer[]>();
  const smallConsumerStats = new Set<string>();
  let untrackedConsumption = initialUntracked;

  // Resolve every device's node id and value once. `included_in_stat` always
  // names a stat_consumption, so the hierarchy is keyed by that, while the
  // rendered set holds node ids (stat_consumption or stat_rate, per `getId`).
  const deviceByStat = new Map<string, DeviceConsumptionEnergyPreference>();
  const deviceValues = new Map<string, number>();
  const renderedIds = new Set<string>();
  devices.forEach((device) => {
    deviceByStat.set(device.stat_consumption, device);
    const id = getId(device);
    // Falsy check (not `=== undefined`) mirrors the cards' original `!stat_rate` guard.
    if (!id) {
      return;
    }
    const value = getValue(id);
    deviceValues.set(id, value);
    if (value >= minThreshold) {
      renderedIds.add(id);
    }
  });

  /** Node id of a device rendered as its own node, else undefined. */
  const renderedId = (statConsumption: string): string | undefined => {
    const device = deviceByStat.get(statConsumption);
    if (!device) {
      return undefined;
    }
    const id = getId(device);
    return id && renderedIds.has(id) ? id : undefined;
  };

  // Walk up the included_in_stat chain to the first ancestor that is rendered.
  // Bounded because a hand-edited config can make included_in_stat cyclic.
  const findEffectiveParent = (
    includedInStat: string | undefined
  ): string | undefined => {
    let current = includedInStat;
    for (let hops = 0; current && hops < devices.length; hops++) {
      const rendered = renderedId(current);
      if (rendered) {
        return rendered;
      }
      const device = deviceByStat.get(current);
      if (!device) {
        return undefined;
      }
      current = device.included_in_stat;
    }
    return undefined;
  };

  devices.forEach((device, idx) => {
    const id = getId(device);
    if (!id) {
      return;
    }
    const value = deviceValues.get(id)!;
    const effectiveParent = findEffectiveParent(device.included_in_stat);

    if (value < minThreshold) {
      // Collect small consumers instead of folding them into untracked
      const parentKey = effectiveParent ?? rootNodeId;
      if (!smallConsumersByParent.has(parentKey)) {
        smallConsumersByParent.set(parentKey, []);
      }
      smallConsumersByParent.get(parentKey)!.push({
        id,
        includedInStat: device.included_in_stat,
        name: device.name,
        value,
        effectiveParent,
        idx,
      });
      smallConsumerStats.add(device.stat_consumption);
      return;
    }

    const node: SankeyDeviceNode = {
      id,
      label: getLabel(id, device.name),
      value,
      color: getGraphColorByIndex(idx, computedStyle),
      index: 4,
      parent: effectiveParent,
      entityId: getEntityId(id),
    };
    if (node.parent) {
      parentLinks[node.id] = node.parent;
      links.push({ source: node.parent, target: node.id });
    } else {
      untrackedConsumption -= value;
    }
    deviceNodes.push(node);
  });

  // Process small consumers - show a lone one directly, group clusters as "Other"
  smallConsumersByParent.forEach((allConsumers, parentKey) => {
    // A small consumer whose included_in_stat chain reaches another small
    // consumer is already counted inside that ancestor's value - drop it so
    // totals don't double-count nested devices. A rendered ancestor ends the
    // walk: the consumer links to it and never touches untracked, so it can't
    // be double-counted through anything further up.
    const consumers = allConsumers.filter((consumer) => {
      let ancestor = consumer.includedInStat;
      for (let hops = 0; ancestor && hops < devices.length; hops++) {
        if (renderedId(ancestor)) {
          return true;
        }
        if (smallConsumerStats.has(ancestor)) {
          return false;
        }
        ancestor = deviceByStat.get(ancestor)?.included_in_stat;
      }
      return true;
    });

    const totalValue = consumers.reduce((sum, c) => sum + c.value, 0);
    if (totalValue <= 0) {
      return;
    }

    if (consumers.length === 1) {
      const consumer = consumers[0];
      const node: SankeyDeviceNode = {
        id: consumer.id,
        label: getLabel(consumer.id, consumer.name),
        value: consumer.value,
        color: getGraphColorByIndex(consumer.idx, computedStyle),
        index: 4,
        parent: consumer.effectiveParent,
        entityId: getEntityId(consumer.id),
      };
      if (node.parent) {
        parentLinks[node.id] = node.parent;
        links.push({ source: node.parent, target: node.id });
      } else {
        untrackedConsumption -= consumer.value;
      }
      deviceNodes.push(node);
    } else {
      const otherNodeId = `other_${parentKey}`;
      const otherNode: SankeyDeviceNode = {
        id: otherNodeId,
        label: localize(OTHER_LABEL_KEY),
        value: ceilOtherValue ? Math.ceil(totalValue) : totalValue,
        color: unavailableColor,
        index: 4,
      };
      if (parentKey !== rootNodeId) {
        parentLinks[otherNodeId] = parentKey;
        links.push({ source: parentKey, target: otherNodeId });
      } else {
        untrackedConsumption -= totalValue;
      }
      deviceNodes.push(otherNode);
    }
  });

  // Add untracked consumption nodes for parent devices whose sub-devices
  // don't account for the parent's full consumption
  const parentDeviceIds = new Set(Object.values(parentLinks));
  parentDeviceIds.forEach((parentId) => {
    const parentNode = deviceNodes.find((node) => node.id === parentId);
    if (!parentNode) {
      return;
    }
    const childrenSum = deviceNodes.reduce(
      (sum, node) =>
        parentLinks[node.id] === parentId ? sum + node.value : sum,
      0
    );
    const untracked = parentNode.value - childrenSum;
    if (untracked > untrackedFloor) {
      const untrackedNodeId = `untracked_${parentId}`;
      deviceNodes.push({
        id: untrackedNodeId,
        label: localize(UNTRACKED_LABEL_KEY),
        value: untracked,
        color: unavailableColor,
        index: 4,
      });
      parentLinks[untrackedNodeId] = parentId;
      links.push({
        source: parentId,
        target: untrackedNodeId,
        value: untracked,
      });
    }
  });

  return { deviceNodes, parentLinks, links, untrackedConsumption };
};

/** Bucket device nodes by their entity's area and floor. */
export const groupSankeyDevicesByFloorAndArea = (
  hass: HomeAssistant,
  deviceNodes: Node[]
): {
  areas: Record<string, { value: number; devices: Node[] }>;
  floors: Record<string, { value: number; areas: string[] }>;
} => {
  const areas: Record<string, { value: number; devices: Node[] }> = {
    no_area: {
      value: 0,
      devices: [],
    },
  };
  const floors: Record<string, { value: number; areas: string[] }> = {
    no_floor: {
      value: 0,
      areas: ["no_area"],
    },
  };
  deviceNodes.forEach((deviceNode) => {
    const entity = hass.states[deviceNode.id];
    const { area, floor } = entity
      ? getEntityContext(
          entity,
          hass.entities,
          hass.devices,
          hass.areas,
          hass.floors
        )
      : { area: null, floor: null };
    if (area) {
      if (area.area_id in areas) {
        areas[area.area_id].value += deviceNode.value;
        areas[area.area_id].devices.push(deviceNode);
      } else {
        areas[area.area_id] = {
          value: deviceNode.value,
          devices: [deviceNode],
        };
      }
      // see if the area has a floor
      if (floor) {
        if (floor.floor_id in floors) {
          floors[floor.floor_id].value += deviceNode.value;
          if (!floors[floor.floor_id].areas.includes(area.area_id)) {
            floors[floor.floor_id].areas.push(area.area_id);
          }
        } else {
          floors[floor.floor_id] = {
            value: deviceNode.value,
            areas: [area.area_id],
          };
        }
      } else {
        floors.no_floor.value += deviceNode.value;
        if (!floors.no_floor.areas.includes(area.area_id)) {
          floors.no_floor.areas.unshift(area.area_id);
        }
      }
    } else {
      areas.no_area.value += deviceNode.value;
      areas.no_area.devices.push(deviceNode);
    }
  });
  return { areas, floors };
};

/**
 * Organize device nodes into hierarchical sections based on parent-child
 * relationships (top-level parents first, then their children, recursively).
 */
export const getSankeyDeviceSections = (
  parentLinks: Record<string, string>,
  deviceNodes: Node[]
): Node[][] => {
  const parentSection: Node[] = [];
  const childSection: Node[] = [];
  const parentIds = Object.values(parentLinks);
  const remainingLinks: Record<string, string> = {};

  deviceNodes.forEach((deviceNode) => {
    const isChild = deviceNode.id in parentLinks;
    const isParent = parentIds.includes(deviceNode.id);
    if (isParent && !isChild) {
      // Top-level parents (have children but no parents themselves)
      parentSection.push(deviceNode);
    } else {
      childSection.push(deviceNode);
    }
  });

  // Filter out links where parent is already in current parent section
  Object.entries(parentLinks).forEach(([child, parent]) => {
    if (!parentSection.some((node) => node.id === parent)) {
      remainingLinks[child] = parent;
    }
  });

  if (parentSection.length > 0) {
    // Recursively process child section with remaining links
    return [
      parentSection,
      ...getSankeyDeviceSections(remainingLinks, childSection),
    ];
  }

  // Base case: no more parent-child relationships to process
  return [deviceNodes];
};

export interface BuildSankeyLayoutOptions {
  hass: HomeAssistant;
  computedStyle: CSSStyleDeclaration;
  localize: HomeAssistant["localize"];
  deviceNodes: SankeyDeviceNode[];
  parentLinks: Record<string, string>;
  rootNodeId: string;
  groupByFloor: boolean;
  groupByArea: boolean;
  untrackedConsumption: number;
  untrackedFloor: number;
}

/**
 * Build the floor/area grouping layer, emit the device section nodes with
 * their final section indices, and add the top-level untracked node.
 */
export const buildSankeyLayout = (
  options: BuildSankeyLayoutOptions
): { nodes: Node[]; links: Link[] } => {
  const {
    hass,
    computedStyle,
    localize,
    deviceNodes,
    parentLinks,
    rootNodeId,
    groupByFloor,
    groupByArea,
    untrackedConsumption,
    untrackedFloor,
  } = options;

  const nodes: Node[] = [];
  const links: Link[] = [];
  const primaryColor = computedStyle.getPropertyValue("--primary-color").trim();

  const devicesWithoutParent = deviceNodes.filter(
    (node) => !parentLinks[node.id]
  );

  if (groupByArea || groupByFloor) {
    const { areas, floors } = groupSankeyDevicesByFloorAndArea(
      hass,
      devicesWithoutParent
    );

    Object.keys(floors)
      .sort(
        (a, b) =>
          (hass.floors[b]?.level ?? -Infinity) -
          (hass.floors[a]?.level ?? -Infinity)
      )
      .forEach((floorId) => {
        let floorNodeId = `floor_${floorId}`;
        if (floorId === "no_floor" || !groupByFloor) {
          // link "no_floor" areas to the root
          floorNodeId = rootNodeId;
        } else {
          nodes.push({
            id: floorNodeId,
            label: hass.floors[floorId].name,
            value: floors[floorId].value,
            index: 2,
            color: primaryColor,
          });
          links.push({
            source: rootNodeId,
            target: floorNodeId,
          });
        }
        floors[floorId].areas.forEach((areaId) => {
          let targetNodeId: string;

          if (areaId === "no_area" || !groupByArea) {
            // If group_by_area is false, link devices to floor or root
            targetNodeId = floorNodeId;
          } else {
            // Create area node and link it to floor
            const areaNodeId = `area_${areaId}`;
            nodes.push({
              id: areaNodeId,
              label: hass.areas[areaId]?.name || areaId,
              value: areas[areaId].value,
              index: 3,
              color: primaryColor,
            });
            links.push({
              source: floorNodeId,
              target: areaNodeId,
              value: areas[areaId].value,
            });
            targetNodeId = areaNodeId;
          }

          // Link devices to the appropriate target (area, floor, or root)
          areas[areaId].devices.forEach((device) => {
            links.push({
              source: targetNodeId,
              target: device.id,
              value: device.value,
            });
          });
        });
      });
  } else {
    devicesWithoutParent.forEach((deviceNode) => {
      links.push({
        source: rootNodeId,
        target: deviceNode.id,
        value: deviceNode.value,
      });
    });
  }

  const deviceSections = getSankeyDeviceSections(parentLinks, deviceNodes);
  deviceSections.forEach((section, index) => {
    section.forEach((node: Node) => {
      nodes.push({ ...node, index: 4 + index });
    });
  });

  // untracked consumption
  if (untrackedConsumption > untrackedFloor) {
    nodes.push({
      id: "untracked",
      label: localize(UNTRACKED_LABEL_KEY),
      value: untrackedConsumption,
      color: computedStyle.getPropertyValue("--state-unavailable-color").trim(),
      index: 3 + deviceSections.length,
    });
    links.push({
      source: rootNodeId,
      target: "untracked",
      value: untrackedConsumption,
    });
  }

  return { nodes, links };
};
