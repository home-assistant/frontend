import { describe, expect, it } from "vitest";
import deepFreeze from "deep-freeze";
import type { LovelaceConfig } from "../../../../src/data/lovelace/config/types";
import type { LovelaceStackSectionConfig } from "../../../../src/data/lovelace/config/section";
import {
  addCard,
  addSection,
  deleteCard,
  deleteSection,
  duplicateSection,
  moveCard,
  moveCardToContainer,
  moveSection,
  replaceCard,
  wrapSectionInStack,
} from "../../../../src/panels/lovelace/editor/config-util";
import {
  findLovelaceContainer,
  findLovelaceItems,
  getCardSectionConfig,
  parseLovelaceCardPath,
  updateLovelaceContainer,
} from "../../../../src/panels/lovelace/editor/lovelace-path";

const fixture = (): LovelaceConfig =>
  deepFreeze({
    views: [
      {
        type: "sections",
        sections: [
          { type: "grid", cards: [{ type: "heading", heading: "Outside" }] },
          {
            type: "stack",
            column_span: 2,
            sections: [
              {
                type: "grid",
                column_span: 3,
                background: { color: "red" },
                cards: [{ type: "heading", heading: "A" }],
              },
              { type: "grid", cards: [{ type: "heading", heading: "B" }] },
            ],
          },
          { type: "stack", sections: [{ type: "grid", cards: [] }] },
        ],
      },
    ],
  });
const stack = (config: LovelaceConfig, index = 1) =>
  findLovelaceContainer(config, [0, index]) as LovelaceStackSectionConfig;

describe("section stack editing", () => {
  it("wraps a section in place without losing its settings or saved width", () => {
    const config = updateLovelaceContainer(fixture(), [0, 0], {
      type: "grid",
      column_span: 2,
      background: { color: "blue", opacity: 30 },
      theme: "Night",
      cards: [{ type: "heading", heading: "Original" }],
    });
    deepFreeze(config);
    const section = findLovelaceContainer(config, [0, 0]);
    const updated = wrapSectionInStack(config, 0, 0);
    expect(stack(updated, 0).column_span).toBe(2);
    expect(stack(updated, 0).sections).toEqual([section]);
    expect(stack(updated, 0).sections[0]).toBe(section);
    expect(stack(updated, 0).background).toBeUndefined();
    expect(stack(updated, 0).theme).toBeUndefined();
    expect(findLovelaceContainer(updated, [0, 1])).toBe(stack(config));
    expect(findLovelaceContainer(config, [0, 0])).toBe(section);
  });

  it("removes a wrapped section immediately after its stack and retains the empty stack", () => {
    const config = fixture();
    const wrapped = wrapSectionInStack(config, 0, 0);
    const removed = moveSection(wrapped, [0, 0, 0], [0, 1]);
    expect(stack(removed, 0).sections).toEqual([]);
    expect(findLovelaceContainer(removed, [0, 1])).toBe(
      findLovelaceContainer(config, [0, 0])
    );
    expect(stack(removed, 2)).toBe(stack(config));
  });

  it("rejects wrapping an existing stack", () => {
    expect(() => wrapSectionInStack(fixture(), 0, 1)).toThrow(
      "Nested section stacks"
    );
  });

  it("addresses a child and its cards without mutating the configuration", () => {
    const config = fixture();
    expect(parseLovelaceCardPath([0, 1, 0, 0])).toEqual({
      viewIndex: 0,
      sectionIndex: 1,
      subsectionIndex: 0,
      cardIndex: 0,
    });
    const updated = replaceCard(config, [0, 1, 0, 0], {
      type: "heading",
      heading: "Edited",
    });
    expect(findLovelaceItems("cards", updated, [0, 1, 0])).toEqual([
      { type: "heading", heading: "Edited" },
    ]);
    expect(stack(updated).sections[1]).toBe(stack(config).sections[1]);
    expect(stack(config).sections[0].column_span).toBe(3);
  });

  it("reuses card add, delete, and move operations for children", () => {
    let config = addCard(fixture(), [0, 1, 0], { type: "button" });
    config = moveCard(config, [0, 1, 0, 1], [0, 1, 1, 0]);
    expect(findLovelaceItems("cards", config, [0, 1, 1])?.[0].type).toBe(
      "button"
    );
    config = deleteCard(config, [0, 1, 1, 0]);
    expect(findLovelaceItems("cards", config, [0, 1, 1])).toHaveLength(1);
  });

  it("allows moving cards between children of the same stack", () => {
    const updated = moveCardToContainer(fixture(), [0, 1, 0, 0], [0, 1, 1]);
    expect(findLovelaceItems("cards", updated, [0, 1, 0])).toHaveLength(0);
    expect(findLovelaceItems("cards", updated, [0, 1, 1])).toHaveLength(2);
    expect(() =>
      moveCardToContainer(fixture(), [0, 1, 0, 0], [0, 1, 0])
    ).toThrow();
  });

  it("moves cards between ordinary sections and stack children", () => {
    let config = moveCard(fixture(), [0, 0, 0], [0, 1, 0, 1]);
    config = moveCard(config, [0, 1, 0, 0], [0, 0, 0]);
    expect(findLovelaceItems("cards", config, [0, 0])).toEqual([
      { type: "heading", heading: "A" },
    ]);
    expect(findLovelaceItems("cards", config, [0, 1, 0])).toEqual([
      { type: "heading", heading: "Outside" },
    ]);
  });

  it("uses the stack width in card editors without overwriting the child", () => {
    const config = fixture();
    expect(getCardSectionConfig(config, [0, 1, 0]).column_span).toBe(2);
    expect(stack(config).sections[0].column_span).toBe(3);
    expect(getCardSectionConfig(config, [0, 0])).toBe(
      findLovelaceContainer(config, [0, 0])
    );
  });

  it("updates only the selected child's settings", () => {
    const config = fixture();
    const child = findLovelaceContainer(config, [0, 1, 0]);
    const updated = updateLovelaceContainer(config, [0, 1, 0], {
      ...child,
      theme: "Night",
    });
    expect(stack(updated).sections[0].theme).toBe("Night");
    expect(stack(updated).sections[1]).toBe(stack(config).sections[1]);
    expect(stack(updated).column_span).toBe(2);
  });

  it("adds, duplicates, and deletes children through existing section helpers", () => {
    let config = addSection(fixture(), 0, { type: "grid", cards: [] }, 1);
    config = duplicateSection(config, 0, 0, 1);
    expect(stack(config).sections).toHaveLength(4);
    expect(stack(config).sections[1]).toEqual(stack(config).sections[0]);
    expect(stack(config).sections[1]).not.toBe(stack(config).sections[0]);
    config = deleteSection(config, 0, 1, 1);
    expect(stack(config).sections).toHaveLength(3);
  });

  it("duplicates an entire stack independently", () => {
    const config = duplicateSection(fixture(), 0, 1);
    expect(stack(config, 2)).toEqual(stack(config));
    expect(stack(config, 2).sections[0]).not.toBe(stack(config).sections[0]);
  });

  it("reorders children inside a stack", () => {
    const config = fixture();
    const updated = moveSection(config, [0, 1, 0], [0, 1, 1]);
    expect(stack(updated).sections).toEqual(
      [...stack(config).sections].reverse()
    );
  });

  it("accounts for a top-level removal before the destination stack", () => {
    const config = fixture();
    const updated = moveSection(config, [0, 0], [0, 1, 1]);
    expect(stack(updated, 0).sections[1]).toBe(
      findLovelaceContainer(config, [0, 0])
    );
    expect(stack(updated, 0).sections).toHaveLength(3);
  });

  it("moves a child between stacks", () => {
    const config = fixture();
    const updated = moveSection(config, [0, 1, 0], [0, 2, 0]);
    expect(stack(updated).sections).toHaveLength(1);
    expect(stack(updated, 2).sections[0]).toBe(stack(config).sections[0]);
  });

  it("restores the saved width when a child moves to the main view", () => {
    const config = moveSection(fixture(), [0, 1, 0], [0, 0]);
    expect(findLovelaceContainer(config, [0, 0]).column_span).toBe(3);
    expect(stack(config, 2).sections).toHaveLength(1);
  });

  it("keeps an emptied stack editable", () => {
    const config = moveSection(fixture(), [0, 2, 0], [0, 0]);
    expect(stack(config, 3).sections).toEqual([]);
  });

  it("rejects nesting through adding, moving, and editing", () => {
    const config = fixture();
    expect(() => addSection(config, 0, stack(config), 2)).toThrow(
      "Nested section stacks"
    );
    expect(() => moveSection(config, [0, 1], [0, 2, 0])).toThrow(
      "Nested section stacks"
    );
    expect(() =>
      updateLovelaceContainer(config, [0, 1, 0], stack(config))
    ).toThrow("Nested section stacks");
  });

  it("rejects cards placed directly in a stack", () => {
    expect(() => addCard(fixture(), [0, 1], { type: "button" })).toThrow();
  });

  it("does not interpret an ordinary section as a stack", () => {
    expect(() => findLovelaceContainer(fixture(), [0, 0, 0])).toThrow(
      "Section is not a stack"
    );
  });
});
