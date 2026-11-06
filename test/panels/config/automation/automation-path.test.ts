import { describe, expect, it } from "vitest";
import type { ConfigChange } from "../../../../src/common/util/config-change";
import {
  getChangedRowPaths,
  getUndoRevealTarget,
} from "../../../../src/panels/config/automation/automation-path";

// Decides which row undo or redo shows, so the user sees what changed.
describe("getChangedRowPaths", () => {
  it("points at the rows that changed", () => {
    const list = ["actions", 0, "then"];

    expect(
      getChangedRowPaths([
        { op: "add", path: [...list, 1], value: {} },
        { op: "replace", path: [...list, 0, "delay"], before: 1, after: 2 },
      ])
    ).toEqual([
      [...list, 1],
      [...list, 0, "delay"],
    ]);
    expect(
      getChangedRowPaths([{ op: "remove", path: [...list, 1], value: {} }])
    ).toEqual([list]);
    expect(
      getChangedRowPaths([{ op: "add", path: list, value: [{}] }])
    ).toEqual([[...list, 0], list]);
    expect(
      getChangedRowPaths([
        {
          op: "replace",
          path: list,
          before: [{ delay: 1 }],
          after: [{ delay: 1 }, { delay: 2 }, { delay: 3 }],
        },
      ])
    ).toEqual([[...list, 1], list]);
    expect(
      getChangedRowPaths([
        { op: "move", from: [...list, 0], path: [...list, 2] },
      ])
    ).toEqual([[...list, 2]]);
    // Swapped neighbours, either could be the one that was moved
    expect(
      getChangedRowPaths([
        { op: "move", from: [...list, 0], path: [...list, 1] },
      ])
    ).toEqual([
      [...list, 1],
      [...list, 0],
    ]);
  });

  it("opens the sidebar only on the row it showed", () => {
    const changes: ConfigChange[] = [
      { op: "move", from: ["actions", 1], path: ["actions", 0] },
    ];
    const meta = { sidebarRow: { undo: ["actions", 1], redo: ["actions", 0] } };

    expect(getUndoRevealTarget({ changes, meta }, true)).toEqual({
      paths: [["actions", 1]],
      openSidebar: true,
    });
    expect(getUndoRevealTarget({ changes, meta }, false)).toEqual({
      paths: [["actions", 0]],
      openSidebar: true,
    });
    // Without a sidebar row, the changed rows are only shown
    expect(getUndoRevealTarget({ changes }, false)).toEqual({
      paths: [
        ["actions", 0],
        ["actions", 1],
      ],
      openSidebar: false,
    });
  });
});
