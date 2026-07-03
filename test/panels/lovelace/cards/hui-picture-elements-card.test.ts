import { describe, expect, it, vi } from "vitest";
import "../../../../src/panels/lovelace/cards/hui-picture-elements-card";
import type {
  ActionHandlerOptions,
  ActionHandlerResolution,
} from "../../../../src/data/lovelace/action_handler";

// The card resolves pointer gestures on #root to the routed element they
// belong to; the gesture engine itself is the shared action-handler directive
// (tested separately). These tests exercise the resolver: reserved-element
// pass-through, seed collection from the rendered DOM, and nearest routing.

// Hoisted above the imports at runtime: bundler-defined globals the card's
// import graph reads at eval (setup.ts already provides __DEMO__/__DEV__).
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

interface CardInternals {
  hass: unknown;
  preview: boolean;

  _elements?: HTMLElement[];
  // eslint-disable-next-line @typescript-eslint/naming-convention -- private card internals
  _resolveGesture: (
    x: number,
    y: number,
    ev: Event
  ) => ActionHandlerResolution | null;
}

interface FakeElementInit {
  delegated?: boolean;
  visible?: boolean;
  rect?: DOMRect | null;
  isText?: boolean;
  options?: ActionHandlerOptions;
}

const OPTIONS: ActionHandlerOptions = {
  hasTap: true,
  hasHold: true,
  hasDoubleClick: false,
};

const makeElement = ({
  delegated = true,
  visible = true,
  rect = new DOMRect(0, 0, 24, 24),
  isText = false,
  options = OPTIONS,
}: FakeElementInit = {}): HTMLElement => {
  const el = document.createElement("div");
  el.classList.add("element");
  Object.assign(el, {
    delegatedActions: delegated,
    checkVisibility: () => visible,
    getHitInfo: () =>
      rect ? { rect, isText: isText || undefined, options } : null,
  });
  return el;
};

const makeCard = (elements: HTMLElement[]) => {
  const card = document.createElement(
    "hui-picture-elements-card"
  ) as unknown as CardInternals;
  card.hass = {};
  card.preview = false;
  card._elements = elements;
  const root = document.createElement("div");
  root.getBoundingClientRect = () => new DOMRect(0, 0, 400, 300);
  elements.forEach((el) => root.appendChild(el));
  Object.defineProperty(card, "_root", { value: root });
  const press = (x: number, y: number, target?: HTMLElement, init?: object) =>
    card._resolveGesture(x, y, {
      type: "mousedown",
      button: 0,
      ctrlKey: false,
      composedPath: () => [target ?? root, root],
      ...init,
    } as unknown as Event);
  return { card, root, press };
};

const iconAt = (x: number, y: number, init: FakeElementInit = {}) =>
  makeElement({ rect: new DOMRect(x - 12, y - 12, 24, 24), ...init });

describe("hui-picture-elements-card gesture resolver", () => {
  it("routes a background press in reach to the nearest icon", () => {
    const near = iconAt(100, 100);
    const far = iconAt(200, 100);
    const { press } = makeCard([near, far]);
    const resolution = press(120, 100);
    expect(resolution?.target).toBe(near);
    expect(resolution?.options).toBe(OPTIONS);
  });

  it("returns null beyond reach of every seed", () => {
    const { press } = makeCard([iconAt(100, 100)]);
    expect(press(160, 100)).toBeNull();
  });

  it("resolves overlapping icons by distance, not paint order", () => {
    const a = iconAt(100, 100);
    const b = iconAt(110, 100);
    const { press } = makeCard([a, b]);
    // Inside both boxes, but closer to a's center.
    expect(press(102, 100, b)?.target).toBe(a);
  });

  it("a press on a label's own text keeps the label", () => {
    const label = makeElement({
      rect: new DOMRect(90, 94, 80, 12),
      isText: true,
    });
    const icon = iconAt(100, 80);
    const { press } = makeCard([label, icon]);
    expect(press(100, 100)?.target).toBe(label);
  });

  it("never routes in the editor preview", () => {
    const { card, press } = makeCard([iconAt(100, 100)]);
    (card as unknown as { preview: boolean }).preview = true;
    expect(press(100, 100)).toBeNull();
  });

  it("never routes a non-primary or ctrl press", () => {
    const { press } = makeCard([iconAt(100, 100)]);
    expect(press(100, 100, undefined, { button: 2 })).toBeNull();
    expect(press(100, 100, undefined, { ctrlKey: true })).toBeNull();
  });

  it("leaves a press on a non-routed element to that element", () => {
    // An image element, service button, or conditional child handles its own
    // gestures; routing must not steal a press landing on it, even in reach.
    const reserved = makeElement({ delegated: false, rect: null });
    const icon = iconAt(100, 100);
    const { press } = makeCard([reserved, icon]);
    expect(press(105, 100, reserved)).toBeNull();
  });

  it("skips warning and action-less elements", () => {
    const warning = makeElement({ rect: null });
    const { press } = makeCard([warning]);
    expect(press(100, 100)).toBeNull();
  });

  it("skips hidden and zero-size elements", () => {
    const hidden = iconAt(100, 100, { visible: false });
    const collapsed = makeElement({ rect: new DOMRect(100, 100, 0, 0) });
    const { press } = makeCard([hidden, collapsed]);
    expect(press(100, 100)).toBeNull();
  });
});
