import { describe, expect, it } from "vitest";
import { hasAssignedContent, hasAssignedElements } from "../src/utils/slot";

// Components hide wrappers of empty slots, e.g. the padding of an empty card.
// Whitespace between tags must not count as content.
const slotEvent = (light: string, name?: string) => {
  const host = document.createElement("div");
  host.innerHTML = light;
  const slot = document.createElement("slot");
  if (name) {
    slot.name = name;
  }
  host.attachShadow({ mode: "open" }).append(slot);
  return { target: slot } as unknown as Event;
};

describe("hasAssignedContent", () => {
  it("ignores whitespace", () => {
    expect(hasAssignedContent(slotEvent("\n   \n"))).toBe(false);
  });

  it("counts text", () => {
    expect(hasAssignedContent(slotEvent(" Hello "))).toBe(true);
  });

  it("counts elements", () => {
    expect(hasAssignedContent(slotEvent("\n <p></p>\n"))).toBe(true);
  });
});

describe("hasAssignedElements", () => {
  it("only counts elements assigned to the slot", () => {
    const light = '<span slot="icon"></span> text';
    expect(hasAssignedElements(slotEvent(light, "icon"))).toBe(true);
    expect(hasAssignedElements(slotEvent(light, "actions"))).toBe(false);
  });
});
