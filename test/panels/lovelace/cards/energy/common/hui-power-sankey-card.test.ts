import { describe, it, expect } from "vitest";
import type { Node } from "../../../../../../src/components/chart/ha-sankey-chart";

describe("hui-power-sankey-card", () => {
  describe("node click handling", () => {
    it("should identify device nodes as clickable via entityId", () => {
      const nodes: Node[] = [
        { id: "solar", value: 1000, index: 0, label: "Solar" },
        { id: "home", value: 1500, index: 1, label: "Home" },
        {
          id: "sensor.device1",
          value: 200,
          index: 4,
          label: "Device 1",
          entityId: "sensor.device1",
        },
      ];

      const clickableNodes = nodes.filter((n) => n.entityId);
      expect(clickableNodes).toHaveLength(1);
      expect(clickableNodes[0].entityId).toBe("sensor.device1");
    });

    it("should not make source/area/floor nodes clickable", () => {
      const nodes: Node[] = [
        { id: "solar", value: 1000, index: 0 },
        { id: "grid", value: 500, index: 0 },
        { id: "home", value: 1500, index: 1 },
        { id: "floor_1", value: 800, index: 2 },
        { id: "area_kitchen", value: 400, index: 3 },
      ];

      const clickableNodes = nodes.filter((n) => n.entityId);
      expect(clickableNodes).toHaveLength(0);
    });
  });
});
