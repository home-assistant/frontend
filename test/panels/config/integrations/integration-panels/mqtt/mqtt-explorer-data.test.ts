import { describe, expect, it } from "vitest";
import type { MQTTExplorerTopic } from "../../../../../../src/data/mqtt";
import type { ExplorerMessage } from "../../../../../../src/panels/config/integrations/integration-panels/mqtt/mqtt-explorer-data";
import {
  buildTopicTree,
  diffJsonPayloads,
  formatPayload,
  sortedChildren,
  trimMessages,
} from "../../../../../../src/panels/config/integrations/integration-panels/mqtt/mqtt-explorer-data";

const topic = (
  name: string,
  messages: number,
  messageRate: number
): MQTTExplorerTopic => ({
  topic: name,
  messages,
  bytes: 0,
  message_rate: messageRate,
  byte_rate: 0,
  last_received: 0,
  retained: false,
  qos: 0,
  subscriptions: 0,
});

describe("buildTopicTree", () => {
  it("aggregates counts on every level", () => {
    const root = buildTopicTree([
      topic("zigbee2mqtt/kitchen", 10, 1),
      topic("zigbee2mqtt/kitchen/availability", 1, 0),
      topic("zigbee2mqtt/garage", 4, 0.5),
      topic("tele/plug/SENSOR", 2, 0),
    ]);

    expect(sortedChildren(root).map((node) => node.name)).toEqual([
      "tele",
      "zigbee2mqtt",
    ]);
    const zigbee = root.children.get("zigbee2mqtt")!;
    expect(zigbee.topicCount).toBe(3);
    expect(zigbee.messages).toBe(15);
    expect(zigbee.messageRate).toBe(1.5);
    const kitchen = zigbee.children.get("kitchen")!;
    expect(kitchen.path).toBe("zigbee2mqtt/kitchen");
    expect(kitchen.topic?.messages).toBe(10);
    expect(kitchen.topicCount).toBe(2);
    expect(kitchen.children.get("availability")?.topicCount).toBe(1);
  });

  it("sorts numeric levels naturally", () => {
    const root = buildTopicTree([
      topic("sensor/10", 1, 0),
      topic("sensor/2", 1, 0),
    ]);
    expect(
      sortedChildren(root.children.get("sensor")!).map((node) => node.name)
    ).toEqual(["2", "10"]);
  });
});

describe("formatPayload", () => {
  it("pretty prints JSON and leaves other payloads alone", () => {
    expect(formatPayload('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(formatPayload("online")).toBe("online");
    expect(formatPayload("{not json")).toBe("{not json");
  });
});

describe("diffJsonPayloads", () => {
  it("lists changed, added and removed keys with dotted paths", () => {
    expect(
      diffJsonPayloads(
        '{"power": 10, "energy": {"total": 1}, "old": true}',
        '{"power": 12, "energy": {"total": 1, "today": 0.5}}'
      )
    ).toEqual([
      { key: "power", type: "changed", oldValue: "10", newValue: "12" },
      { key: "energy.today", type: "added", newValue: "0.5" },
      { key: "old", type: "removed", oldValue: "true" },
    ]);
  });

  it("keeps dotted keys apart from nested objects", () => {
    expect(
      diffJsonPayloads('{"a.b": 1, "a": {"b": 2}}', '{"a.b": 3, "a": {"b": 2}}')
    ).toEqual([
      { key: '["a.b"]', type: "changed", oldValue: "1", newValue: "3" },
    ]);
  });

  it("keeps array indexes apart from numeric object keys", () => {
    expect(diffJsonPayloads('{"a": [1]}', '{"a": {"0": 1}}')).toEqual([
      { key: 'a["0"]', type: "added", newValue: "1" },
      { key: "a[0]", type: "removed", oldValue: "1" },
    ]);
  });

  it("returns no changes for identical payloads", () => {
    expect(diffJsonPayloads('{"a": 1}', '{"a": 1}')).toEqual([]);
  });

  it("can't compare payloads that aren't JSON", () => {
    expect(diffJsonPayloads("online", "offline")).toBeUndefined();
  });
});

// Each message costs its payload length plus 100.
const message = (
  topicName: string,
  id: number,
  payloadLength = 900
): ExplorerMessage => ({
  id,
  topic: topicName,
  payload: "x".repeat(payloadLength),
  truncated: false,
  size: payloadLength,
  timestamp: id,
  retain: false,
  qos: 0,
});

// Newest first, like the card keeps them.
const history = (topicName: string, ids: number[]): ExplorerMessage[] =>
  ids.map((id) => message(topicName, id)).reverse();

const ids = (messages: Map<string, ExplorerMessage[]>) =>
  Object.fromEntries(
    [...messages].map(([topicName, kept]) => [
      topicName,
      kept.map((item) => item.id),
    ])
  );

describe("trimMessages", () => {
  it("keeps everything within the budget", () => {
    const messages = new Map([
      ["a", history("a", [1, 3])],
      ["b", history("b", [2])],
    ]);
    expect(trimMessages(messages, 3000)).toBe(0);
    expect(ids(messages)).toEqual({ a: [3, 1], b: [2] });
  });

  it("removes the oldest messages below the budget", () => {
    const messages = new Map([
      ["a", history("a", [1, 3, 5])],
      ["b", history("b", [2, 4])],
    ]);
    // 5000 is over 4000, trimmed to 90%: two oldest go.
    expect(trimMessages(messages, 4000)).toBe(2);
    expect(ids(messages)).toEqual({ a: [5, 3], b: [4] });
  });

  it("drops topics without messages left", () => {
    const messages = new Map([
      ["a", history("a", [1])],
      ["b", history("b", [2, 3])],
    ]);
    expect(trimMessages(messages, 2500)).toBe(1);
    expect(ids(messages)).toEqual({ b: [3, 2] });
  });

  it("removes other topics before the kept topic", () => {
    const messages = new Map([
      ["a", history("a", [1, 2, 3])],
      ["b", history("b", [4, 5])],
    ]);
    expect(trimMessages(messages, 4000, "a")).toBe(2);
    expect(ids(messages)).toEqual({ a: [3, 2, 1] });
  });

  it("never removes the newest message of the kept topic", () => {
    const messages = new Map([
      ["a", history("a", [1, 2, 3])],
      ["b", history("b", [4])],
    ]);
    expect(trimMessages(messages, 500, "a")).toBe(3);
    expect(ids(messages)).toEqual({ a: [3] });
  });

  it("counts the per message overhead for small payloads", () => {
    const messages = new Map([["a", [message("a", 2, 0), message("a", 1, 0)]]]);
    expect(trimMessages(messages, 150)).toBe(1);
    expect(ids(messages)).toEqual({ a: [2] });
  });
});
