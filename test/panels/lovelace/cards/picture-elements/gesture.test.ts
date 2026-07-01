import { describe, expect, it } from "vitest";
import type { GestureEndState } from "../../../../../src/panels/lovelace/cards/picture-elements/gesture";
import { resolveGestureEnd } from "../../../../../src/panels/lovelace/cards/picture-elements/gesture";

const end = (over: Partial<GestureEndState>): GestureEndState => ({
  hasHold: false,
  hasDoubleClick: false,
  held: false,
  cancelled: false,
  eventType: "click",
  clickDetail: 1,
  doubleTapPending: false,
  ...over,
});

describe("resolveGestureEnd", () => {
  it("resolves a plain release to a tap", () => {
    expect(resolveGestureEnd(end({}))).toBe("tap");
    expect(resolveGestureEnd(end({ eventType: "touchend" }))).toBe("tap");
  });

  it("does nothing on a cancelled or moved touch", () => {
    expect(resolveGestureEnd(end({ eventType: "touchcancel" }))).toBe("none");
    expect(
      resolveGestureEnd(end({ eventType: "touchend", cancelled: true }))
    ).toBe("none");
  });

  it("still taps on a cancelled MOUSE release (cancel only guards touch)", () => {
    // `cancelled` is set by touchmove; a mouse click is unaffected.
    expect(resolveGestureEnd(end({ cancelled: true }))).toBe("tap");
  });

  it("cancel wins over a held press", () => {
    expect(
      resolveGestureEnd(
        end({ hasHold: true, held: true, eventType: "touchcancel" })
      )
    ).toBe("none");
    expect(
      resolveGestureEnd(
        end({
          hasHold: true,
          held: true,
          eventType: "touchend",
          cancelled: true,
        })
      )
    ).toBe("none");
  });

  it("resolves a held press to a hold, over tap and double_tap", () => {
    expect(resolveGestureEnd(end({ hasHold: true, held: true }))).toBe("hold");
    expect(
      resolveGestureEnd(
        end({ hasHold: true, held: true, hasDoubleClick: true })
      )
    ).toBe("hold");
  });

  it("ignores held when no hold action is configured", () => {
    expect(resolveGestureEnd(end({ hasHold: false, held: true }))).toBe("tap");
  });

  it("arms a tap on the first release when a double-tap action exists", () => {
    expect(
      resolveGestureEnd(end({ hasDoubleClick: true, doubleTapPending: false }))
    ).toBe("arm-tap");
    // touch first release (no click detail) also arms.
    expect(
      resolveGestureEnd(
        end({
          hasDoubleClick: true,
          eventType: "touchend",
          clickDetail: 0,
          doubleTapPending: false,
        })
      )
    ).toBe("arm-tap");
  });

  it("fires double_tap on the second release within the window", () => {
    expect(
      resolveGestureEnd(
        end({ hasDoubleClick: true, clickDetail: 2, doubleTapPending: true })
      )
    ).toBe("double_tap");
    expect(
      resolveGestureEnd(
        end({
          hasDoubleClick: true,
          eventType: "touchend",
          clickDetail: 0,
          doubleTapPending: true,
        })
      )
    ).toBe("double_tap");
  });

  it("keeps arming (never double) while the click is still a single click", () => {
    // detail < 2 forces arm even if a timer is somehow pending.
    expect(
      resolveGestureEnd(
        end({ hasDoubleClick: true, clickDetail: 1, doubleTapPending: true })
      )
    ).toBe("arm-tap");
  });

  it("models a full tap→double_tap sequence", () => {
    const first = resolveGestureEnd(
      end({ hasDoubleClick: true, clickDetail: 1, doubleTapPending: false })
    );
    expect(first).toBe("arm-tap"); // schedules the tap
    const second = resolveGestureEnd(
      end({ hasDoubleClick: true, clickDetail: 2, doubleTapPending: true })
    );
    expect(second).toBe("double_tap"); // cancels the pending tap
  });
});
