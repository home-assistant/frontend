import { describe, expect, it } from "vitest";
import { computeNativeModalOrigin } from "../../src/external_app/native-modal-origin";

/** Stands in for an element with a box on screen; jsdom gives every element a zero rect. */
const elementWithRect = (rect: Partial<DOMRect>): Element => {
  const el = document.createElement("div");
  el.getBoundingClientRect = () =>
    ({ x: 0, y: 0, width: 0, height: 0, ...rect }) as DOMRect;
  return el;
};

const eventFrom = (target: unknown): Event =>
  ({ composedPath: () => [target] }) as unknown as Event;

describe("computeNativeModalOrigin", () => {
  it("takes the box of the element the event was fired on", () => {
    const ev = eventFrom(
      elementWithRect({ x: 12, y: 340, width: 160, height: 80 })
    );

    expect(computeNativeModalOrigin(ev)).toEqual({
      x: 12,
      y: 340,
      width: 160,
      height: 80,
    });
  });

  // The app only needs somewhere to grow from, so fractions of a pixel are noise.
  it("rounds to whole pixels", () => {
    const ev = eventFrom(
      elementWithRect({ x: 12.4, y: 339.6, width: 160.5, height: 80.2 })
    );

    expect(computeNativeModalOrigin(ev)).toEqual({
      x: 12,
      y: 340,
      width: 161,
      height: 80,
    });
  });

  // A deep link or a keyboard shortcut has nothing on screen to grow out of.
  it("returns nothing when the event came from no element", () => {
    expect(computeNativeModalOrigin(eventFrom(window))).toBeUndefined();
    expect(computeNativeModalOrigin(eventFrom(undefined))).toBeUndefined();
  });

  it("returns nothing for an element with no area", () => {
    expect(
      computeNativeModalOrigin(
        eventFrom(elementWithRect({ x: 5, y: 5, width: 0, height: 40 }))
      )
    ).toBeUndefined();
    expect(
      computeNativeModalOrigin(
        eventFrom(elementWithRect({ x: 5, y: 5, width: 40, height: 0 }))
      )
    ).toBeUndefined();
  });
});
