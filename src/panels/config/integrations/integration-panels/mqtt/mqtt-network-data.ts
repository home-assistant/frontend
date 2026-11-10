import {
  mdiFileDocumentOutline,
  mdiMagnify,
  mdiNoteTextOutline,
} from "@mdi/js";
import { hexBlend } from "../../../../../common/color/hex";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../../../common/translations/localize";
import type {
  NetworkData,
  NetworkLink,
  NetworkNode,
} from "../../../../../components/chart/ha-network-graph";
import type {
  MQTTExplorerEntityTopic,
  MQTTExplorerSource,
  MQTTExplorerStructure,
} from "../../../../../data/mqtt";
import { mdiMqttLogo } from "../../../../../resources/mqtt-logo-svg";
import type { HomeAssistant } from "../../../../../types";

export const BROKER_NODE_ID = "broker";
// The subentries share one node, the device of each subentry hangs under it
export const SUBENTRIES_NODE_ID = "subentries";
export const SOURCE_PREFIX = "source:";
export const DEVICE_PREFIX = "device:";
export const NO_DEVICE_PREFIX = "no_device:";
export const ENTITY_PREFIX = "entity:";
export const ARTIFACT_PREFIX = "artifact:";
export const TOPIC_PREFIX = "topic:";

// IDs and topics can hold ":", so the parts are separated by a line break
const TOPIC_ID_SEPARATOR = "\n";

// The ID of a topic node of an entity or artifact node
export const topicNodeId = (
  ownerNodeId: string,
  topic: MQTTExplorerEntityTopic
): string =>
  `${TOPIC_PREFIX}${[ownerNodeId, topic.direction, topic.topic].join(TOPIC_ID_SEPARATOR)}`;

export const parseTopicNodeId = (id: string) => {
  const [ownerNodeId, direction, ...topic] = id
    .substring(TOPIC_PREFIX.length)
    .split(TOPIC_ID_SEPARATOR);
  return {
    ownerNodeId,
    direction: direction as MQTTExplorerEntityTopic["direction"],
    topic: topic.join(TOPIC_ID_SEPARATOR),
  };
};

// Entities that were not set up have no source and hang under their device
const UNKNOWN_SOURCE = "discovery";

// Devices are circles, so entities get their own shape
const ENTITY_SYMBOL =
  "path://M50 0 L93.3 25 L93.3 75 L50 100 L6.7 75 L6.7 25 Z";

const FADED_OPACITY = 0.15;

// A faded node keeps a stronger border, so it keeps its shape
const FADED_BORDER_OPACITY = 0.45;
const FADED_BORDER_WIDTH = 1;

// The purple of the MQTT logo
const MQTT_LOGO_COLOR = "#660066";

// A link has the color of the node below it, and gets thinner further down
const SOURCE_LINK_WIDTH = 3;
const DEVICE_LINK_WIDTH = 2.25;
const CHILD_DEVICE_LINK_WIDTH = 1.75;
const ENTITY_LINK_WIDTH = 1.5;
const TOPIC_LINK_WIDTH = 1;

const TOPIC_CLICK_MARGIN = 10;

const ROOT_SYMBOL_SIZE = 60;
const ROOT_SYMBOL_SIZE_MOBILE = 40;
const SOURCE_SYMBOL_SIZE = 40;
const SOURCE_SYMBOL_SIZE_MOBILE = 30;
const ROOT_LABEL = {
  position: "bottom",
  fontWeight: "bold",
  fontSize: 14.4,
} as const;

const iconSymbol = (
  color: string,
  iconColor: string,
  iconPath: string,
  borderColor?: string
): string => {
  const border = borderColor
    ? ` stroke="${borderColor}" stroke-width="${FADED_BORDER_WIDTH}"`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="0.5" y="0.5" width="31" height="31" rx="6" fill="${color.trim()}"${border}/><path transform="translate(6 6) scale(0.8333)" fill="${iconColor}" d="${iconPath}"/></svg>`;
  return `image://data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const enum MQTTNodeCategory {
  Broker = 0,
  Source = 1,
  Device = 2,
  ChildDevice = 3,
  Entity = 4,
  DeviceTrigger = 5,
  Tag = 6,
  SubscribeTopic = 7,
  PublishTopic = 8,
}

export const sourceName = (
  source: MQTTExplorerSource,
  localize: LocalizeFunc
): string => {
  if (source.type === "yaml") {
    return localize("ui.panel.config.mqtt.visualization.source_yaml");
  }
  // A discovery origin is named by its title
  if (source.type === "discovery" && !source.title) {
    return localize("ui.panel.config.mqtt.visualization.source_discovery");
  }
  return source.title ?? source.id;
};

export function createMQTTNetworkChartData(
  structure: MQTTExplorerStructure,
  hass: HomeAssistant,
  element: Element,
  isMobileSize: boolean,
  hiddenSources: string[],
  focusedNode?: string,
  searchFilter = "",
  // Names of the legend categories that are switched off
  hiddenCategories: string[] = []
): NetworkData {
  const style = getComputedStyle(element);
  const color = (name: string) => style.getPropertyValue(name).trim();
  const iconColor = color("--text-primary-color");
  const brokerColor = MQTT_LOGO_COLOR;
  const sourceColor = color("--orange-color");
  const deviceColor = color("--indigo-color");
  const childDeviceColor = color("--light-blue-color");
  const entityColor = color("--green-color");
  const artifactStyles = {
    device_trigger: {
      category: MQTTNodeCategory.DeviceTrigger,
      symbol: "triangle",
      color: color("--amber-color"),
    },
    tag: {
      category: MQTTNodeCategory.Tag,
      symbol: "rect",
      color: color("--pink-color"),
    },
  };
  const subscribeColor = color("--cyan-color");
  const publishColor = color("--deep-orange-color");
  const unavailableColor = color("--disabled-color");
  const backgroundColor = color("--card-background-color");
  // A faded node is mixed with the background instead of made transparent,
  // so the links behind it do not show through
  const graphBackgroundColor = color("--primary-background-color");
  const fade = (value: string, opacity = FADED_OPACITY) =>
    hexBlend(value, graphBackgroundColor, opacity * 100);

  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  // The icon of the broker and the sources, which is redrawn when faded
  const nodeIcons = new Map<string, { color: string; path: string }>();

  // The topics of a focused entity or artifact, linked to its node
  const addTopicNodes = (
    ownerNodeId: string,
    topics: MQTTExplorerEntityTopic[]
  ) => {
    topics.forEach((topic) => {
      const topicId = topicNodeId(ownerNodeId, topic);
      const isPublish = topic.direction === "publish";
      nodes.push({
        id: topicId,
        name: topic.topic,
        category: isPublish
          ? MQTTNodeCategory.PublishTopic
          : MQTTNodeCategory.SubscribeTopic,
        value: 0,
        symbolSize: 10,
        symbol: "diamond",
        itemStyle: {
          color: isPublish ? publishColor : subscribeColor,
          // An invisible border makes the small diamond easier to click, up
          // to its label
          borderColor: "transparent",
          borderWidth: TOPIC_CLICK_MARGIN,
        },
        // The border moves the label away, this keeps it where it was
        label: { distance: 0 },
        // A click would darken the wide border
        selectable: false,
        polarDistance: 0.95,
      });
      links.push({
        source: ownerNodeId,
        target: topicId,
        value: 0,
        symbol: "none",
        lineStyle: {
          width: TOPIC_LINK_WIDTH,
          color: isPublish ? publishColor : subscribeColor,
          type: isPublish ? "dashed" : "solid",
        },
      });
    });
  };
  const localize = (key: string) =>
    hass.localize(`ui.panel.config.mqtt.visualization.${key}` as LocalizeKeys);
  const categories = [
    {
      name: localize("broker"),
      symbol: "roundRect",
      itemStyle: { color: brokerColor },
    },
    {
      name: localize("source"),
      symbol: "roundRect",
      itemStyle: { color: sourceColor },
    },
    {
      name: localize("device"),
      symbol: "circle",
      itemStyle: { color: deviceColor },
    },
    {
      name: localize("child_device"),
      symbol: "circle",
      itemStyle: { color: childDeviceColor },
    },
    {
      name: localize("entity"),
      symbol: ENTITY_SYMBOL,
      itemStyle: { color: entityColor },
    },
    {
      name: localize("artifact_device_trigger"),
      symbol: artifactStyles.device_trigger.symbol,
      itemStyle: { color: artifactStyles.device_trigger.color },
    },
    {
      name: localize("artifact_tag"),
      symbol: artifactStyles.tag.symbol,
      itemStyle: { color: artifactStyles.tag.color },
    },
    {
      name: localize("subscribe_topic"),
      symbol: "diamond",
      itemStyle: { color: subscribeColor },
    },
    {
      name: localize("publish_topic"),
      symbol: "diamond",
      itemStyle: { color: publishColor },
    },
  ];

  nodes.push({
    id: BROKER_NODE_ID,
    name: localize("broker"),
    category: MQTTNodeCategory.Broker,
    value: 4,
    symbolSize: isMobileSize ? ROOT_SYMBOL_SIZE_MOBILE : ROOT_SYMBOL_SIZE,
    symbol: iconSymbol(brokerColor, iconColor, mdiMqttLogo),
    itemStyle: { color: brokerColor },
    label: ROOT_LABEL,
    polarDistance: 0,
    fixed: true,
  });
  nodeIcons.set(BROKER_NODE_ID, { color: brokerColor, path: mdiMqttLogo });

  const sourceIcons: Record<MQTTExplorerSource["type"], string> = {
    yaml: mdiFileDocumentOutline,
    subentry: mdiNoteTextOutline,
    discovery: mdiMagnify,
  };
  const hidden = new Set(hiddenSources);
  const visibleSources = structure.sources.filter((s) => !hidden.has(s.id));
  const addSourceNode = (
    id: string,
    name: string,
    type: MQTTExplorerSource["type"],
    context?: string
  ) => {
    nodes.push({
      id,
      name,
      context,
      category: MQTTNodeCategory.Source,
      value: 3,
      symbolSize: isMobileSize ? SOURCE_SYMBOL_SIZE_MOBILE : SOURCE_SYMBOL_SIZE,
      symbol: iconSymbol(sourceColor, iconColor, sourceIcons[type]),
      itemStyle: { color: sourceColor },
      label: ROOT_LABEL,
      polarDistance: 0.25,
    });
    nodeIcons.set(id, { color: sourceColor, path: sourceIcons[type] });
    links.push({
      source: BROKER_NODE_ID,
      target: id,
      value: 3,
      symbol: "none",
      // Links are half transparent by default
      lineStyle: { width: SOURCE_LINK_WIDTH, color: sourceColor, opacity: 1 },
    });
  };
  visibleSources.forEach((source) => {
    if (source.type !== "subentry") {
      addSourceNode(
        `${SOURCE_PREFIX}${source.id}`,
        sourceName(source, hass.localize),
        source.type,
        source.sw_version ?? undefined
      );
    }
  });
  if (visibleSources.some((source) => source.type === "subentry")) {
    addSourceNode(
      SUBENTRIES_NODE_ID,
      localize("source_subentries"),
      "subentry"
    );
  }

  const sourceIds = new Set(visibleSources.map((s) => s.id));
  const subentrySourceIds = new Set(
    visibleSources.filter((s) => s.type === "subentry").map((s) => s.id)
  );
  // Link to the broker if a source is missing, so no link points to nothing
  const sourceNode = (source: string) => {
    if (subentrySourceIds.has(source)) {
      return SUBENTRIES_NODE_ID;
    }
    return sourceIds.has(source) ? `${SOURCE_PREFIX}${source}` : BROKER_NODE_ID;
  };
  // Only items of the sources that are shown
  const devices = structure.devices.filter((d) =>
    d.sources.some((source) => sourceIds.has(source))
  );
  const deviceIds = new Set(devices.map((d) => d.device_id));
  devices.forEach((device) => {
    const id = `${DEVICE_PREFIX}${device.device_id}`;
    const deviceNodeColor = device.child_device
      ? childDeviceColor
      : deviceColor;
    nodes.push({
      id,
      name: device.name ?? device.device_id,
      category: device.child_device
        ? MQTTNodeCategory.ChildDevice
        : MQTTNodeCategory.Device,
      value: 2,
      symbolSize: device.child_device ? 20 : 24,
      symbol: "circle",
      itemStyle: { color: deviceNodeColor },
      polarDistance: 0.5,
    });
    // A device linked to a parent hangs under that parent, otherwise under
    // each of its sources
    if (device.via_device_id && deviceIds.has(device.via_device_id)) {
      links.push({
        source: `${DEVICE_PREFIX}${device.via_device_id}`,
        target: id,
        value: 2,
        symbol: "none",
        lineStyle: {
          width: CHILD_DEVICE_LINK_WIDTH,
          color: deviceNodeColor,
          type: device.child_device ? "solid" : "dashed",
        },
      });
      return;
    }
    device.sources.forEach((source) => {
      if (!sourceIds.has(source)) {
        return;
      }
      links.push({
        source: sourceNode(source),
        target: id,
        value: 2,
        symbol: "none",
        lineStyle: { width: DEVICE_LINK_WIDTH, color: deviceNodeColor },
      });
    });
  });

  const noDeviceNodes = new Set<string>();
  // Items without a device hang under "No linked device" of their source
  const noDeviceNode = (source: string): string => {
    const id = `${NO_DEVICE_PREFIX}${source}`;
    if (!noDeviceNodes.has(id)) {
      noDeviceNodes.add(id);
      nodes.push({
        id,
        name: localize("no_linked_device"),
        category: MQTTNodeCategory.Device,
        value: 2,
        symbolSize: 24,
        symbol: "emptyCircle",
        itemStyle: { color: deviceColor },
        polarDistance: 0.5,
      });
      links.push({
        source: sourceNode(source),
        target: id,
        value: 2,
        symbol: "none",
        lineStyle: {
          width: DEVICE_LINK_WIDTH,
          color: deviceColor,
          type: "dashed",
        },
      });
    }
    return id;
  };

  structure.entities.forEach((entity) => {
    const source = entity.source ?? UNKNOWN_SOURCE;
    const onDevice = !!entity.device_id && deviceIds.has(entity.device_id);
    // An entity without a source is shown when its device is shown
    if (entity.source ? !sourceIds.has(source) : !onDevice) {
      return;
    }
    const id = `${ENTITY_PREFIX}${entity.entity_id}`;
    const parent = onDevice
      ? `${DEVICE_PREFIX}${entity.device_id}`
      : noDeviceNode(source);
    // A focused entity shows its topics
    const isExpanded = id === focusedNode;
    const entityNodeColor = entity.available ? entityColor : unavailableColor;
    // A filled hexagon has topics that can be expanded
    const filled = entity.topics.length > 0 && !isExpanded;
    nodes.push({
      id,
      name: entity.name ?? entity.entity_id,
      context: entity.entity_id,
      // Unavailable entities are only grayed out, the legend filters them
      // with the other entities
      category: MQTTNodeCategory.Entity,
      value: 1,
      symbolSize: 16,
      symbol: ENTITY_SYMBOL,
      itemStyle: {
        color: filled ? entityNodeColor : backgroundColor,
        borderColor: entityNodeColor,
        borderWidth: 2,
      },
      polarDistance: 0.75,
    });
    links.push({
      source: parent,
      target: id,
      value: 1,
      symbol: "none",
      lineStyle: { width: ENTITY_LINK_WIDTH, color: entityNodeColor },
    });

    if (isExpanded) {
      addTopicNodes(id, entity.topics);
    }
  });

  structure.artifacts.forEach((artifact) => {
    if (
      !sourceIds.has(artifact.source) ||
      (artifact.device_id && !deviceIds.has(artifact.device_id))
    ) {
      return;
    }
    const id = `${ARTIFACT_PREFIX}${artifact.artifact_id}`;
    const artifactStyle = artifactStyles[artifact.type];
    nodes.push({
      id,
      name: artifact.artifact_id.split(":").slice(1).join(":"),
      context: localize(`artifact_${artifact.type}`),
      category: artifactStyle.category,
      value: 1,
      symbolSize: 12,
      symbol: artifactStyle.symbol,
      itemStyle: { color: artifactStyle.color },
      polarDistance: 0.75,
    });
    links.push({
      source: artifact.device_id
        ? `${DEVICE_PREFIX}${artifact.device_id}`
        : noDeviceNode(artifact.source),
      target: id,
      value: 1,
      symbol: "none",
      lineStyle: {
        width: ENTITY_LINK_WIDTH,
        color: artifactStyle.color,
        type: "dotted",
      },
    });
    // A focused trigger or tag shows its topic
    if (id === focusedNode) {
      addTopicNodes(id, artifact.topics);
    }
  });

  // Keep the focused node with its parents and children clear and fade the
  // rest, so the topics of an entity or the items of a device stand out. A
  // search keeps the matches clear instead, with the links between them.
  const focusNodes = new Set<string>();
  const filter = searchFilter.trim().toLowerCase();
  if (filter) {
    const topicsByNode = new Map([
      ...structure.entities.map((entity) => [
        `${ENTITY_PREFIX}${entity.entity_id}`,
        entity.topics.map((topic) => topic.topic),
      ]),
      ...structure.artifacts.map((artifact) => [
        `${ARTIFACT_PREFIX}${artifact.artifact_id}`,
        artifact.topics.map((topic) => topic.topic),
      ]),
    ] as [string, string[]][]);
    nodes.forEach((node) => {
      if (
        [node.name, node.context, ...(topicsByNode.get(node.id) ?? [])].some(
          (value) => value?.toLowerCase().includes(filter)
        )
      ) {
        focusNodes.add(node.id);
      }
    });
  } else if (focusedNode && nodes.some((node) => node.id === focusedNode)) {
    // Links point from parent to child, so walk up to the broker and down to
    // all the children of the focused node
    const parents = new Map<string, string[]>();
    const children = new Map<string, string[]>();
    links.forEach((link) => {
      parents.set(link.target, [
        ...(parents.get(link.target) ?? []),
        link.source,
      ]);
      children.set(link.source, [
        ...(children.get(link.source) ?? []),
        link.target,
      ]);
    });
    const walk = (start: string, next: Map<string, string[]>) => {
      const queue = [start];
      while (queue.length) {
        const nodeId = queue.pop()!;
        (next.get(nodeId) ?? []).forEach((other) => {
          if (!focusNodes.has(other)) {
            focusNodes.add(other);
            queue.push(other);
          }
        });
      }
    };
    focusNodes.add(focusedNode);
    walk(focusedNode, parents);
    walk(focusedNode, children);
  }
  const fadedNodes = new Set<string>();
  const fadeNode = (node: NetworkNode) => {
    fadedNodes.add(node.id);
    const icon = nodeIcons.get(node.id);
    if (icon) {
      node.symbol = iconSymbol(
        fade(icon.color),
        fade(iconColor),
        icon.path,
        fade(icon.color, FADED_BORDER_OPACITY)
      );
    }
    const { color: fill, borderColor, borderWidth } = node.itemStyle ?? {};
    // A node without a border gets one in its own color. A transparent
    // border only makes a node easier to click.
    const edgeColor = borderColor ?? fill;
    node.itemStyle = {
      ...node.itemStyle,
      ...(fill && { color: fade(fill) }),
      ...(edgeColor &&
        edgeColor !== "transparent" &&
        !icon && {
          borderColor: fade(edgeColor, FADED_BORDER_OPACITY),
          borderWidth: Math.max(borderWidth ?? 0, FADED_BORDER_WIDTH),
        }),
    };
    node.label = { ...node.label, show: false };
  };
  if (focusNodes.size || filter) {
    nodes.forEach((node) => {
      if (!focusNodes.has(node.id)) {
        fadeNode(node);
      }
    });
  }

  // Only show the categories that are in the graph, and renumber the nodes.
  // The broker and the sources have an icon of their own, not a legend entry.
  const usedCategories = new Set(nodes.map((node) => node.category));
  const newIndex = new Map<number, number>();
  const shownCategories = categories.filter((_, index) => {
    if (
      !usedCategories.has(index) ||
      index === MQTTNodeCategory.Broker ||
      index === MQTTNodeCategory.Source
    ) {
      return false;
    }
    newIndex.set(index, newIndex.size);
    return true;
  });
  const hiddenCategoryNames = new Set(hiddenCategories);
  // Taken before the nodes get their new category index below
  const hiddenNodeIds = new Set(
    nodes
      .filter((node) =>
        hiddenCategoryNames.has(categories[node.category!]?.name)
      )
      .map((node) => node.id)
  );
  const isHidden = (node: NetworkNode) => hiddenNodeIds.has(node.id);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const childIds = new Map<string, string[]>();
  links.forEach((link) => {
    childIds.set(link.source, [
      ...(childIds.get(link.source) ?? []),
      link.target,
    ]);
  });
  const shownBelow = new Map<string, boolean>();
  // Whether a node has a node below it that the legend shows
  const hasShownBelow = (id: string): boolean => {
    if (!shownBelow.has(id)) {
      shownBelow.set(id, false);
      shownBelow.set(
        id,
        (childIds.get(id) ?? []).some((childId) => {
          const child = nodesById.get(childId);
          return child && (!isHidden(child) || hasShownBelow(childId));
        })
      );
    }
    return shownBelow.get(id)!;
  };
  nodes.forEach((node) => {
    // The legend hides the nodes of its unselected categories with their
    // links. A hidden node with shown nodes below it would leave those
    // unlinked, so it stays without a category, faded like the nodes outside
    // a focus.
    if (isHidden(node) && hasShownBelow(node.id)) {
      if (!fadedNodes.has(node.id)) {
        fadeNode(node);
      }
      node.category = undefined;
    } else {
      node.category = newIndex.get(node.category!);
    }
  });
  links.forEach((link) => {
    if (fadedNodes.has(link.source) || fadedNodes.has(link.target)) {
      link.lineStyle = { ...link.lineStyle, opacity: FADED_OPACITY };
    }
  });

  return { nodes, links, categories: shownCategories };
}
