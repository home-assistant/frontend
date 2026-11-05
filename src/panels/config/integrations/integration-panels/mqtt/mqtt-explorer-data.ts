import type {
  MQTTExplorerMessage,
  MQTTExplorerTopic,
} from "../../../../../data/mqtt";

export const MAX_MESSAGES_PER_TOPIC = 20;

export interface ExplorerMessage extends MQTTExplorerMessage {
  // Client side id, stable while the message is kept
  id: number;
}

export interface TopicTreeNode {
  name: string;
  path: string;
  children: Map<string, TopicTreeNode>;
  topic?: MQTTExplorerTopic;
  topicCount: number;
  messages: number;
  messageRate: number;
}

const newNode = (name: string, path: string): TopicTreeNode => ({
  name,
  path,
  children: new Map(),
  topicCount: 0,
  messages: 0,
  messageRate: 0,
});

export const buildTopicTree = (
  topics: Iterable<MQTTExplorerTopic>
): TopicTreeNode => {
  const root = newNode("", "");
  for (const topic of topics) {
    let node = root;
    const levels = topic.topic.split("/");
    levels.forEach((level, index) => {
      let child = node.children.get(level);
      if (!child) {
        child = newNode(level, levels.slice(0, index + 1).join("/"));
        node.children.set(level, child);
      }
      child.topicCount++;
      child.messages += topic.messages;
      child.messageRate += topic.message_rate;
      node = child;
    });
    node.topic = topic;
  }
  return root;
};

export const sortedChildren = (node: TopicTreeNode): TopicTreeNode[] =>
  [...node.children.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );

export const parseJsonPayload = (payload: string): unknown => {
  const trimmed = payload.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed);
  } catch (_err) {
    return undefined;
  }
};

export const formatPayload = (payload: string): string => {
  const parsed = parseJsonPayload(payload);
  return parsed === undefined ? payload : JSON.stringify(parsed, null, 2);
};

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

// Keys that need it are quoted, so `{"a.b": 1}` and `{"a": {"b": 1}}` or an
// array index and a numeric object key never end up on the same path.
const childPath = (prefix: string, key: string, isArray: boolean): string => {
  if (isArray) {
    return `${prefix}[${key}]`;
  }
  if (!IDENTIFIER.test(key)) {
    return `${prefix}[${JSON.stringify(key)}]`;
  }
  return prefix ? `${prefix}.${key}` : key;
};

const flatten = (
  value: unknown,
  prefix: string,
  out: Map<string, string>
): Map<string, string> => {
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length && prefix) {
      out.set(prefix, JSON.stringify(value));
    }
    const isArray = Array.isArray(value);
    for (const [key, child] of entries) {
      flatten(child, childPath(prefix, key, isArray), out);
    }
  } else {
    out.set(prefix, JSON.stringify(value));
  }
  return out;
};

export interface PayloadChange {
  key: string;
  type: "added" | "removed" | "changed";
  oldValue?: string;
  newValue?: string;
}

// Returns undefined when the payloads cannot be compared key by key.
export const diffJsonPayloads = (
  oldPayload: string,
  newPayload: string
): PayloadChange[] | undefined => {
  const oldJson = parseJsonPayload(oldPayload);
  const newJson = parseJsonPayload(newPayload);
  if (oldJson === undefined || newJson === undefined) {
    return undefined;
  }
  const oldFlat = flatten(oldJson, "", new Map());
  const newFlat = flatten(newJson, "", new Map());
  const changes: PayloadChange[] = [];
  for (const [key, newValue] of newFlat) {
    const oldValue = oldFlat.get(key);
    if (oldValue === undefined) {
      changes.push({ key, type: "added", newValue });
    } else if (oldValue !== newValue) {
      changes.push({ key, type: "changed", oldValue, newValue });
    }
  }
  for (const [key, oldValue] of oldFlat) {
    if (!newFlat.has(key)) {
      changes.push({ key, type: "removed", oldValue });
    }
  }
  return changes;
};
