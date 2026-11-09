import { describe, expect, it } from "vitest";
import {
  AutomationRowRegistry,
  type AutomationPathRow,
} from "../../../../src/panels/config/automation/automation-path";

const createRow = () =>
  ({
    selected: false,
    openSidebar: () => undefined,
    expand: () => undefined,
  }) as unknown as AutomationPathRow;

// Finds the row a config path belongs to, and the blocks to expand on the way
describe("AutomationRowRegistry", () => {
  it("finds rows by path", () => {
    const registry = new AutomationRowRegistry();
    const block = createRow();
    const row = createRow();
    registry.register(["actions", 0], block);
    registry.register(["actions", 0, "then", 1], row);

    expect(registry.pathOf(row)).toEqual(["actions", 0, "then", 1]);
    // A path into a field of the row also finds it, after its block
    expect(registry.rowsAlong(["actions", 0, "then", 1, "delay"])).toEqual([
      block,
      row,
    ]);

    // A row dragged over the list takes the path, and gives it back when it
    // leaves again
    const dragged = createRow();
    registry.register(["actions", 0, "then", 1], dragged);
    expect(registry.pathOf(row)).toBeUndefined();
    registry.unregister(["actions", 0, "then", 1], dragged);
    expect(registry.pathOf(row)).toEqual(["actions", 0, "then", 1]);

    // A reordered row that took over the path keeps it when the row that
    // had it unregisters
    const moved = createRow();
    registry.register(["actions", 0, "then", 1], moved);
    registry.unregister(["actions", 0, "then", 1], row);
    expect(registry.rowsAlong(["actions", 0, "then", 1])).toEqual([
      block,
      moved,
    ]);
    registry.unregister(["actions", 0, "then", 1], moved);
    expect(registry.pathOf(moved)).toBeUndefined();
  });
});
