import { describe, expect, it } from "vitest";
import type { MQTTExplorerTopic } from "../../../../../../src/data/mqtt";
import type { ExplorerMessage } from "../../../../../../src/panels/config/integrations/integration-panels/mqtt/mqtt-explorer-data";
import {
  buildTopicTree,
  diffJsonPayloads,
  prettyPrintJson,
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

describe("prettyPrintJson", () => {
  it("indents JSON objects and arrays", () => {
    expect(prettyPrintJson('{"a":1,"b":[1,2],"c":{}}')).toBe(
      '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ],\n  "c": {}\n}'
    );
    expect(prettyPrintJson(" [ ] ")).toBe("[]");
  });

  it("matches JSON.stringify for regular payloads", () => {
    const payload = '{"state": "ON", "list": [{"x": -1.5}, null, true]}';
    expect(prettyPrintJson(payload)).toBe(
      JSON.stringify(JSON.parse(payload), null, 2)
    );
  });

  it("keeps big numbers, duplicate keys and escapes as received", () => {
    expect(prettyPrintJson('{"id": 12345678901234567890}')).toBe(
      '{\n  "id": 12345678901234567890\n}'
    );
    expect(prettyPrintJson('{"a": 1, "a": 2}')).toBe(
      '{\n  "a": 1,\n  "a": 2\n}'
    );
    expect(prettyPrintJson('{"s": "a, \\"{b}\\": [c]\\\\"}')).toBe(
      '{\n  "s": "a, \\"{b}\\": [c]\\\\"\n}'
    );
  });

  it("returns undefined for payloads that aren't a JSON object or array", () => {
    expect(prettyPrintJson("online")).toBeUndefined();
    expect(prettyPrintJson("42")).toBeUndefined();
    expect(prettyPrintJson("{not json")).toBeUndefined();
  });

  it("returns undefined for payloads nested too deep", () => {
    const nested = (depth: number) =>
      `${"[".repeat(depth)}1${"]".repeat(depth)}`;
    expect(prettyPrintJson(nested(20))).toBeDefined();
    expect(prettyPrintJson(nested(21))).toBeUndefined();
  });
});

describe("diffJsonPayloads", () => {
  it("compares full payloads when the root changes between object and array", () => {
    expect(diffJsonPayloads("{}", "[]")).toBeUndefined();
    expect(diffJsonPayloads('{"0": 1}', "[1]")).toBeUndefined();
  });

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

  it("compares full payloads when parsing hides the change", () => {
    expect(
      diffJsonPayloads('{"id":9007199254740992}', '{"id":9007199254740993}')
    ).toBeUndefined();
    expect(diffJsonPayloads('{"a":1,"a":2}', '{"a":3,"a":2}')).toBeUndefined();
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

  it("removes the newest message of a topic too", () => {
    const messages = new Map([
      ["a", history("a", [1])],
      ["b", history("b", [2, 3])],
    ]);
    expect(trimMessages(messages, 2500)).toBe(1);
    expect(ids(messages)).toEqual({ a: [], b: [3, 2] });
  });

  it("stays over the budget rather than remove the newest kept message", () => {
    const messages = new Map([
      ["a", history("a", [1, 2])],
      ["b", history("b", [3])],
      ["c", history("c", [4])],
    ]);
    expect(trimMessages(messages, 1000, "a")).toBe(3);
    expect(ids(messages)).toEqual({ a: [2], b: [], c: [] });
  });

  it("removes the messages of other topics before the kept topic", () => {
    const messages = new Map([
      ["a", history("a", [1, 2, 3])],
      ["b", history("b", [4, 5])],
    ]);
    expect(trimMessages(messages, 4000, "a")).toBe(2);
    expect(ids(messages)).toEqual({ a: [3, 2, 1], b: [] });
  });

  it("removes the history of the kept topic last", () => {
    const messages = new Map([
      ["a", history("a", [1, 2, 3])],
      ["b", history("b", [4, 5])],
    ]);
    expect(trimMessages(messages, 500, "a")).toBe(4);
    expect(ids(messages)).toEqual({ a: [3], b: [] });
  });

  it("counts the per message overhead for small payloads", () => {
    const messages = new Map([["a", [message("a", 2, 0), message("a", 1, 0)]]]);
    expect(trimMessages(messages, 150)).toBe(1);
    expect(ids(messages)).toEqual({ a: [2] });
  });
});
