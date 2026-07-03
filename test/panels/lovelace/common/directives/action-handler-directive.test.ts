import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { actionHandlerBind } from "../../../../../src/panels/lovelace/common/directives/action-handler-directive";
import type {
  ActionHandlerDetail,
  ActionHandlerResolution,
} from "../../../../../src/data/lovelace/action_handler";

vi.hoisted(() => {
  Object.assign(globalThis, {
    __STATIC_PATH__: "/",
    __HASS_URL__: "",
    __BUILD__: "modern",
    __VERSION__: "test",
    __BACKWARDS_COMPAT__: false,
    __SUPERVISOR__: false,
    __NAMESPACE__: "frontend",
  });
});

const actionsOn = (el: HTMLElement): string[] => {
  const seen: string[] = [];
  el.addEventListener("action", (ev) => {
    seen.push((ev as CustomEvent<ActionHandlerDetail>).detail.action);
  });
  return seen;
};

const mouse = (type: string, init: MouseEventInit = {}) =>
  new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    detail: 1,
    clientX: 10,
    clientY: 10,
    ...init,
  });

const touch = (
  type: string,
  point: { x: number; y: number } = { x: 10, y: 10 },
  fingers = 1
) => {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const touches = Array.from(
    { length: type === "touchend" ? fingers - 1 : fingers },
    () => ({
      clientX: point.x,
      clientY: point.y,
    })
  );
  Object.assign(ev, {
    touches,
    changedTouches: [{ clientX: point.x, clientY: point.y }],
  });
  return ev;
};

describe("action-handler container (resolve) bindings", () => {
  let container: HTMLElement;
  let a: HTMLElement;
  let b: HTMLElement;
  let aActions: string[];
  let bActions: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    a = document.createElement("div");
    b = document.createElement("div");
    aActions = actionsOn(a);
    bActions = actionsOn(b);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    container.remove();
  });

  // Resolve by x coordinate: left half is a, right half is b.
  const bindByHalf = (options = {}) => {
    const resolve = (x: number): ActionHandlerResolution => ({
      target: x < 50 ? a : b,
      options: {
        hasTap: true,
        hasHold: true,
        hasDoubleClick: true,
        ...options,
      },
    });
    actionHandlerBind(container, { resolve });
  };

  it("fires the resolved target's tap on a plain click", () => {
    bindByHalf({ hasDoubleClick: false, hasHold: false });
    container.dispatchEvent(mouse("mousedown"));
    container.dispatchEvent(mouse("click"));
    expect(aActions).toEqual(["tap"]);
    expect(bActions).toEqual([]);
  });

  it("stays inert when the resolver returns null", () => {
    actionHandlerBind(container, { resolve: () => null });
    container.dispatchEvent(mouse("mousedown"));
    container.dispatchEvent(mouse("click"));
    vi.runOnlyPendingTimers();
    expect(aActions).toEqual([]);
    expect(bActions).toEqual([]);
  });

  it("fires hold once the hold time elapsed", () => {
    bindByHalf({ hasDoubleClick: false });
    container.dispatchEvent(mouse("mousedown"));
    vi.advanceTimersByTime(500);
    container.dispatchEvent(mouse("click"));
    expect(aActions).toEqual(["hold"]);
  });

  it("aborts when the release resolves to a different target", () => {
    bindByHalf({ hasDoubleClick: false, hasHold: false });
    container.dispatchEvent(mouse("mousedown", { clientX: 10 }));
    container.dispatchEvent(mouse("click", { clientX: 90 }));
    vi.runOnlyPendingTimers();
    expect(aActions).toEqual([]);
    expect(bActions).toEqual([]);
  });

  it("pairs a double tap on the same target", () => {
    bindByHalf({ hasHold: false });
    container.dispatchEvent(mouse("mousedown"));
    container.dispatchEvent(mouse("click", { detail: 1 }));
    container.dispatchEvent(mouse("mousedown"));
    container.dispatchEvent(mouse("click", { detail: 2 }));
    vi.runOnlyPendingTimers();
    expect(aActions).toEqual(["double_tap"]);
  });

  it("keeps double-tap windows independent per target", () => {
    // Tap a, then tap b before a's window closes, then complete b's double
    // tap: a resolves to a plain tap and b to a double_tap — a's expiring
    // window must not clobber b's pending one.
    bindByHalf({ hasHold: false });
    container.dispatchEvent(mouse("mousedown", { clientX: 10 }));
    container.dispatchEvent(mouse("click", { clientX: 10, detail: 1 }));
    vi.advanceTimersByTime(200);
    container.dispatchEvent(mouse("mousedown", { clientX: 90 }));
    container.dispatchEvent(mouse("click", { clientX: 90, detail: 1 }));
    vi.advanceTimersByTime(50); // a's window expires, firing a's tap
    container.dispatchEvent(mouse("mousedown", { clientX: 90 }));
    container.dispatchEvent(mouse("click", { clientX: 90, detail: 2 }));
    vi.runOnlyPendingTimers();
    expect(aActions).toEqual(["tap"]);
    expect(bActions).toEqual(["double_tap"]);
  });

  it("ignores multi-touch presses and their releases", () => {
    bindByHalf({ hasDoubleClick: false, hasHold: false });
    container.dispatchEvent(touch("touchstart", { x: 10, y: 10 }, 2));
    container.dispatchEvent(touch("touchend", { x: 10, y: 10 }, 2));
    vi.runOnlyPendingTimers();
    expect(aActions).toEqual([]);
  });

  it("routes a second finger's press by its own coordinates", () => {
    // touches[0] would be the first finger; changedTouches is the new one.
    bindByHalf({ hasDoubleClick: false, hasHold: false });
    const ev = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.assign(ev, {
      touches: [{ clientX: 90, clientY: 10 }],
      changedTouches: [{ clientX: 90, clientY: 10 }],
    });
    container.dispatchEvent(ev);
    container.dispatchEvent(touch("touchend", { x: 90, y: 10 }));
    expect(bActions).toEqual(["tap"]);
    expect(aActions).toEqual([]);
  });

  it("suppresses the context menu only while it owns a gesture", () => {
    bindByHalf({ hasDoubleClick: false });
    const idleMenu = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(idleMenu);
    expect(idleMenu.defaultPrevented).toBe(false);

    container.dispatchEvent(touch("touchstart"));
    const gestureMenu = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(gestureMenu);
    expect(gestureMenu.defaultPrevented).toBe(true);
  });
});

describe("action-handler keyboard-only bindings", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("ignores pointer input but keeps keyboard activation", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const actions = actionsOn(el);
    actionHandlerBind(el, { keyboardOnly: true });
    el.dispatchEvent(mouse("mousedown"));
    el.dispatchEvent(mouse("click"));
    expect(actions).toEqual([]);
    el.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(actions).toEqual(["tap"]);
    el.remove();
  });
});
