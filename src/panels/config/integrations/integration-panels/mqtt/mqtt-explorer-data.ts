import type {
  MQTTExplorerMessage,
  MQTTExplorerTopic,
} from "../../../../../data/mqtt";

export const MAX_MESSAGES_PER_TOPIC = 20;

// Payloads are strings (UTF-16), so 8M characters is about 16 MB, or 488
// payloads at the backend's 16 KiB limit. The per message overhead also caps
// the number of small messages.
export const MAX_RETAINED_SIZE = 8_000_000;
const MESSAGE_OVERHEAD = 100;
// Trim below the budget so the sort does not run on every event once full.
const TRIM_TARGET = 0.9;

export interface ExplorerMessage extends MQTTExplorerMessage {
  // Client side id, stable while the message is kept
  id: number;
}

const messageSize = (message: MQTTExplorerMessage): number =>
  message.payload.length + MESSAGE_OVERHEAD;

const messagesSize = (messages: Iterable<MQTTExplorerMessage>): number => {
  let size = 0;
  for (const message of messages) {
    size += messageSize(message);
  }
  return size;
};

/**
 * Removes the oldest messages when their total size exceeds the budget.
 * Messages of other topics go first; the newest message of `keepTopic` is
 * never removed. Mutates `messages` and returns the number removed.
 */
export const trimMessages = (
  messages: Map<string, ExplorerMessage[]>,
  maxSize: number,
  keepTopic?: string
): number => {
  let size = 0;
  for (const kept of messages.values()) {
    size += messagesSize(kept);
  }
  if (size <= maxSize) {
    return 0;
  }
  const target = maxSize * TRIM_TARGET;
  const candidates: ExplorerMessage[] = [];
  const kept: ExplorerMessage[] = [];
  for (const [topic, topicMessages] of messages) {
    if (topic === keepTopic) {
      kept.push(...topicMessages.slice(1));
    } else {
      candidates.push(...topicMessages);
    }
  }
  candidates.sort((a, b) => a.id - b.id);
  kept.sort((a, b) => a.id - b.id);
  const removed = new Set<number>();
  for (const message of [...candidates, ...kept]) {
    if (size <= target) {
      break;
    }
    removed.add(message.id);
    size -= messageSize(message);
  }
  for (const [topic, topicMessages] of messages) {
    const remaining = topicMessages.filter(
      (message) => !removed.has(message.id)
    );
    if (!remaining.length) {
      messages.delete(topic);
    } else if (remaining.length !== topicMessages.length) {
      messages.set(topic, remaining);
    }
  }
  return removed.size;
};

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
