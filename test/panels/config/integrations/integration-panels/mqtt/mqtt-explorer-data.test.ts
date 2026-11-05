import { describe, expect, it } from "vitest";
import type { MQTTExplorerTopic } from "../../../../../../src/data/mqtt";
import {
  buildTopicTree,
  diffJsonPayloads,
  formatPayload,
  sortedChildren,
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

  it("returns no changes for identical payloads", () => {
    expect(diffJsonPayloads('{"a": 1}', '{"a": 1}')).toEqual([]);
  });

  it("can't compare payloads that aren't JSON", () => {
    expect(diffJsonPayloads("online", "offline")).toBeUndefined();
  });
});
