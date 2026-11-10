import { describe, expect, it, vi } from "vitest";
import "../../../../../src/panels/lovelace/editor/conditions/ha-card-conditions-editor";
import type { HaCardConditionsEditor } from "../../../../../src/panels/lovelace/editor/conditions/ha-card-conditions-editor";
import type { Condition } from "../../../../../src/panels/lovelace/common/validate-condition";

const CONDITIONS: Condition[] = [
  { condition: "state", entity: "light.first", state: "on" },
  { condition: "state", entity: "light.second", state: "off" },
  { condition: "state", entity: "light.third", state: "on" },
];

const createEditor = () => {
  const editor = document.createElement(
    "ha-card-conditions-editor"
  ) as HaCardConditionsEditor;
  editor.conditions = CONDITIONS;
  return editor;
};

const waitForValueChanged = (editor: HaCardConditionsEditor) =>
  new Promise<Condition[]>((resolve) => {
    editor.addEventListener(
      "value-changed",
      (ev) => resolve(ev.detail.value as Condition[]),
      { once: true }
    );
  });

describe("ha-card-conditions-editor sorting", () => {
  it("moves conditions without mutating the input array", async () => {
    const editor = createEditor();
    const input = editor.conditions;
    const changed = waitForValueChanged(editor);
    const stopPropagation = vi.fn();

    (editor as any)._conditionMoved({
      detail: { oldIndex: 0, newIndex: 2 },
      stopPropagation,
    });

    const value = await changed;
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(value).toEqual([CONDITIONS[1], CONDITIONS[2], CONDITIONS[0]]);
    expect(value).not.toBe(input);
    expect(input).toEqual(CONDITIONS);
  });

  it("inserts a condition received from another list", async () => {
    const editor = createEditor();
    const added: Condition = {
      condition: "user",
      users: ["test-user"],
    };
    const changed = waitForValueChanged(editor);

    await (editor as any)._conditionAdded({
      detail: { index: 1, data: added },
      stopPropagation: vi.fn(),
    });

    await expect(changed).resolves.toEqual([
      CONDITIONS[0],
      added,
      CONDITIONS[1],
      CONDITIONS[2],
    ]);
  });

  it("does not insert a cross-level condition twice after a parent rerender", async () => {
    const editor = createEditor();
    const added: Condition = {
      condition: "user",
      users: ["test-user"],
    };
    const changed = waitForValueChanged(editor);
    const addition = (editor as any)._conditionAdded({
      detail: { index: 1, data: added },
      stopPropagation: vi.fn(),
    });
    editor.conditions = [CONDITIONS[0], added, CONDITIONS[1], CONDITIONS[2]];

    await addition;

    await expect(changed).resolves.toEqual([
      CONDITIONS[0],
      added,
      CONDITIONS[1],
      CONDITIONS[2],
    ]);
  });

  it("removes a condition sent to another list", async () => {
    const editor = createEditor();
    const changed = waitForValueChanged(editor);

    await (editor as any)._conditionRemoved({
      detail: { index: 1 },
      stopPropagation: vi.fn(),
    });

    await expect(changed).resolves.toEqual([CONDITIONS[0], CONDITIONS[2]]);
  });

  it("keeps keyboard selection aligned across cross-list changes", async () => {
    const editor = createEditor();
    (editor as any)._rowSortSelected = 1;

    await (editor as any)._conditionAdded({
      detail: { index: 0, data: { condition: "screen" } },
      stopPropagation: vi.fn(),
    });
    expect((editor as any)._rowSortSelected).toBe(2);

    await (editor as any)._conditionRemoved({
      detail: { index: 2 },
      stopPropagation: vi.fn(),
    });
    expect((editor as any)._rowSortSelected).toBeUndefined();
  });

  it("moves a row using its non-pointer actions", async () => {
    const editor = createEditor();
    const changed = waitForValueChanged(editor);

    (editor as any)._moveUp({
      currentTarget: { first: false, index: 1 },
      stopPropagation: vi.fn(),
    });

    await expect(changed).resolves.toEqual([
      CONDITIONS[1],
      CONDITIONS[0],
      CONDITIONS[2],
    ]);
  });

  it("keeps keyboard sorting attached to the moved condition", () => {
    const editor = createEditor();
    (editor as any)._rowSortSelected = 1;

    (editor as any)._moveUp({
      currentTarget: { first: false, index: 1 },
      stopPropagation: vi.fn(),
    });

    expect((editor as any)._rowSortSelected).toBe(0);
  });

  it("preserves a row key when a condition is replaced", () => {
    const editor = createEditor();
    const original = CONDITIONS[1];
    const replacement: Condition = {
      condition: "state",
      entity: "light.second",
      state: "unavailable",
    };
    const key = (editor as any)._getKey(original);

    (editor as any)._conditionChanged({
      detail: { value: replacement },
      target: { index: 1 },
      stopPropagation: vi.fn(),
    });

    expect((editor as any)._getKey(replacement)).toBe(key);
  });

  it("keeps keyboard selection aligned after deletion", () => {
    const editor = createEditor();
    (editor as any)._rowSortSelected = 2;

    (editor as any)._conditionChanged({
      detail: { value: null },
      target: { index: 0 },
      stopPropagation: vi.fn(),
    });

    expect((editor as any)._rowSortSelected).toBe(1);
  });

  it("does not move a row beyond a list boundary", () => {
    const editor = createEditor();
    const changed = vi.fn();
    editor.addEventListener("value-changed", changed);

    (editor as any)._moveUp({
      currentTarget: { first: true, index: 0 },
      stopPropagation: vi.fn(),
    });
    (editor as any)._moveDown({
      currentTarget: { last: true, index: CONDITIONS.length - 1 },
      stopPropagation: vi.fn(),
    });

    expect(changed).not.toHaveBeenCalled();
  });
});
