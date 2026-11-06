import type { ReactiveControllerHost } from "@lit/reactive-element/reactive-controller";
import { describe, expect, it, vi } from "vitest";
import {
  ConfigChangeUndoRedoController,
  type ConfigChangeStep,
} from "../../../src/common/controllers/config-change-undo-redo-controller";
import { nextRender } from "../../../src/common/util/render-status";

interface Config {
  alias?: string;
  actions: { delay: number; alias?: string; enabled?: boolean }[];
}

const createHost = (): ReactiveControllerHost => ({
  addController: vi.fn(),
  removeController: vi.fn(),
  requestUpdate: vi.fn(),
  updateComplete: Promise.resolve(true),
});

const setup = (initial: Config) => {
  let config = initial;
  const applied: ConfigChangeStep[] = [];
  const controller = new ConfigChangeUndoRedoController<Config>(createHost(), {
    currentConfig: () => config,
    apply: (next, step) => {
      config = next;
      applied.push(step);
    },
  });
  const edit = (next: Config) => {
    controller.commit(config, next);
    config = next;
  };
  // A change that bypasses the history, e.g. from the YAML editor
  const replace = (next: Config) => {
    config = next;
  };
  return { controller, edit, replace, applied, current: () => config };
};

// Undo replays stored changes on the current config instead of restoring
// snapshots, so other changes must survive and stale paths must not apply.
describe("ConfigChangeUndoRedoController", () => {
  it("undoes and redoes only the recorded change", () => {
    const { controller, edit, applied, current } = setup({
      actions: [{ delay: 1 }, { delay: 2 }],
    });
    const second = current().actions[1];

    edit({ ...current(), actions: [{ delay: 5 }, second] });
    edit({ ...current() });
    expect(controller.canUndo).toBe(true);

    controller.undo();
    expect(current().actions).toEqual([{ delay: 1 }, { delay: 2 }]);
    expect(current().actions[1]).toBe(second);
    expect(applied[0].changes).toEqual([
      { op: "replace", path: ["actions", 0, "delay"], before: 5, after: 1 },
    ]);
    expect(controller.canUndo).toBe(false);

    controller.redo();
    expect(current().actions[0]).toEqual({ delay: 5 });
    expect(controller.canRedo).toBe(false);
  });

  it("replays structural and value changes in sequence", () => {
    const { controller, edit, current } = setup({ actions: [] });

    edit({ ...current(), actions: [{ delay: 1 }] });
    edit({ ...current(), actions: [{ delay: 2 }] });
    controller.undo();
    controller.undo();
    expect(current().actions).toEqual([]);

    controller.redo();
    controller.redo();
    expect(current().actions).toEqual([{ delay: 2 }]);
    expect(controller.canUndo).toBe(true);
  });

  it("records changes made outside the history as their own step", () => {
    const { controller, edit, replace, applied, current } = setup({
      actions: [{ delay: 1 }, { delay: 3 }],
    });
    edit({ ...current(), actions: [{ delay: 2 }, current().actions[1]] });

    // Reordered, so the recorded path now points at the other action
    replace({ ...current(), actions: [{ delay: 3 }, { delay: 2 }] });
    replace({ ...current(), alias: "Renamed" });
    edit({ ...current(), actions: [{ delay: 3 }, { delay: 4 }] });

    controller.undo();
    expect(current()).toEqual({
      alias: "Renamed",
      actions: [{ delay: 3 }, { delay: 2 }],
    });

    // The reorder and rename were made together, so they undo together
    controller.undo();
    expect(applied[1].changes).toEqual([
      { op: "remove", path: ["alias"], value: "Renamed" },
      { op: "move", from: ["actions", 1], path: ["actions", 0] },
    ]);
    expect(current()).toEqual({ actions: [{ delay: 2 }, { delay: 3 }] });

    controller.undo();
    expect(current()).toEqual({ actions: [{ delay: 1 }, { delay: 3 }] });

    controller.redo();
    controller.redo();
    controller.redo();
    expect(current()).toEqual({
      alias: "Renamed",
      actions: [{ delay: 3 }, { delay: 4 }],
    });
  });

  it("records a drag between two lists as one step", () => {
    const { controller, edit, current } = setup({
      actions: [{ delay: 1 }, { delay: 2 }],
    });
    const [first, second] = current().actions;

    controller.startGroup();
    edit({ ...current(), actions: [first, second, first] });
    edit({ ...current(), actions: [second, first] });
    controller.endGroup();

    controller.undo();
    expect(current().actions).toEqual([{ delay: 1 }, { delay: 2 }]);
    expect(controller.canUndo).toBe(false);
  });

  it("undoes a step an editor puts back together with the previous one", async () => {
    const { controller, edit, current } = setup({ actions: [] });

    edit({ ...current(), actions: [{ delay: 0 }] });
    // An editor fills in its defaults right after the action was added
    edit({ ...current(), actions: [{ delay: 0, alias: "Wait" }] });

    controller.undo();
    // ... and again after undo removed them
    edit({ ...current(), actions: [{ delay: 0, alias: "Wait" }] });
    await nextRender();

    expect(current().actions).toEqual([]);
    expect(controller.canUndo).toBe(false);
    controller.redo();
    expect(current().actions).toEqual([{ delay: 0, alias: "Wait" }]);
  });

  it("undoes defaults an editor fills in over several commits", async () => {
    const { controller, edit, current } = setup({ actions: [] });
    edit({ ...current(), actions: [{ delay: 0 }] });
    edit({ ...current(), actions: [{ delay: 0, alias: "Wait" }] });
    edit({
      ...current(),
      actions: [{ delay: 0, alias: "Wait", enabled: true }],
    });

    // The editor fills its defaults in again, one after the other
    const refill = () => {
      const [action] = current().actions;
      if (!action) {
        return;
      }
      edit({
        ...current(),
        actions: [
          "alias" in action
            ? { ...action, enabled: true }
            : { ...action, alias: "Wait" },
        ],
      });
    };
    controller.undo();
    refill();
    await nextRender();
    refill();
    await nextRender();
    refill();

    expect(current().actions).toEqual([]);
    expect(controller.canUndo).toBe(false);
    controller.redo();
    expect(current().actions).toEqual([
      { delay: 0, alias: "Wait", enabled: true },
    ]);
  });

  it("records the undone value put back by the user as a new step", () => {
    const { controller, edit, current } = setup({ actions: [{ delay: 1 }] });
    edit({ ...current(), actions: [{ delay: 2 }] });
    edit({ ...current(), actions: [{ delay: 3 }] });

    controller.undo();
    window.dispatchEvent(new Event("pointerdown"));
    edit({ ...current(), actions: [{ delay: 3 }] });

    expect(controller.canRedo).toBe(false);
    controller.undo();
    expect(current().actions).toEqual([{ delay: 2 }]);
  });
});
