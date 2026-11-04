import { afterEach, describe, expect, it, vi } from "vitest";
import type { HaBottomSheet } from "../../src/components/ha-bottom-sheet";
import "../../src/components/ha-bottom-sheet";

// The scrollable fade of the sheet observes its body. The controller has no
// observer under the node build of lit, so it is replaced.
vi.mock("@lit-labs/observers/resize-controller", () => ({
  ResizeController: class {
    observe = vi.fn();

    unobserve = vi.fn();

    disconnect = vi.fn();
  },
}));

let sheet: HaBottomSheet | undefined;

const mountSheet = async () => {
  sheet = document.createElement("ha-bottom-sheet");
  document.body.append(sheet);
  await sheet.updateComplete;
  return sheet;
};

afterEach(() => {
  sheet?.remove();
  sheet = undefined;
});

describe("ha-bottom-sheet", () => {
  it("reports a close that lands before the drawer showed", async () => {
    const element = await mountSheet();
    const closed = vi.fn();
    element.addEventListener("closed", closed);

    // A dialog closed right after it opened, e.g. by a navigation, toggles
    // the sheet before the drawer gets to show.
    element.open = true;
    element.open = false;
    await element.updateComplete;

    expect(closed).toHaveBeenCalledOnce();
  });

  it("does not report a close while it stays closed", async () => {
    const element = await mountSheet();
    const closed = vi.fn();
    element.addEventListener("closed", closed);

    element.open = false;
    await element.updateComplete;

    expect(closed).not.toHaveBeenCalled();
  });
});
