import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleAction } from "../../../../src/panels/lovelace/common/handle-action";
import "../../../../src/panels/lovelace/cards/hui-picture-elements-card";

// The card owns the gesture on #root. These tests stub geometry (_routeTarget)
// and drive _onRoutedEvent directly, exercising the pointer choreography
// (button/detail guards, hold/tap/double_tap, touch-vs-mouse contextmenu,
// per-element double-tap window) without a DOM layout.

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

// vi.mock is hoisted above the imports, so the card uses this stubbed handleAction.
vi.mock(
  "../../../../src/panels/lovelace/common/handle-action",
  async (importActual) => ({
    ...(await importActual<Record<string, unknown>>()),
    handleAction: vi.fn(),
  })
);

interface Seed {
  element: HTMLElement;
  config: Record<string, unknown>;
  isIcon: boolean;
}
interface CardInternals {
  hass: unknown;
  preview: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- private card internals
  _routeTarget: (ev: Event) => Seed | undefined;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- private card internals
  _onRoutedEvent: (ev: Event) => void;
}

const action = vi.mocked(handleAction);

const makeCard = () => {
  const card = document.createElement(
    "hui-picture-elements-card"
  ) as unknown as CardInternals;
  card.hass = {};
  card.preview = false;
  let routed: Seed | undefined;
  card._routeTarget = () => routed;
  const aim = (config: Record<string, unknown>): Seed => {
    routed = { element: document.createElement("div"), config, isIcon: true };
    return routed;
  };
  return { card, aim };
};

const mouse = (type: string, init: MouseEventInit = {}) =>
  new MouseEvent(type, { button: 0, detail: 1, cancelable: true, ...init });
const touch = (type: string) => new Event(type, { cancelable: true });

describe("hui-picture-elements-card gesture routing", () => {
  beforeEach(() => {
    action.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("routes a mouse tap to the target", () => {
    const { card, aim } = makeCard();
    const seed = aim({ tap_action: { action: "toggle" } });
    card._onRoutedEvent(mouse("mousedown"));
    card._onRoutedEvent(mouse("click"));
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(seed.element, {}, seed.config, "tap");
  });

  it("never routes a keyboard/assistive-tech click (detail 0)", () => {
    const { card, aim } = makeCard();
    aim({ tap_action: { action: "toggle" } });
    card._onRoutedEvent(mouse("mousedown"));
    card._onRoutedEvent(mouse("click", { detail: 0 }));
    expect(action).not.toHaveBeenCalled();
  });

  it("ignores a non-primary button and a ctrl-click", () => {
    const { card, aim } = makeCard();
    aim({ tap_action: { action: "toggle" } });
    card._onRoutedEvent(mouse("mousedown", { button: 2 }));
    card._onRoutedEvent(mouse("click"));
    card._onRoutedEvent(mouse("mousedown", { ctrlKey: true }));
    card._onRoutedEvent(mouse("click"));
    expect(action).not.toHaveBeenCalled();
  });

  it("fires the hold action after the hold time", () => {
    const { card, aim } = makeCard();
    const seed = aim({
      tap_action: { action: "toggle" },
      hold_action: { action: "more-info" },
    });
    card._onRoutedEvent(mouse("mousedown"));
    vi.advanceTimersByTime(500);
    card._onRoutedEvent(mouse("click"));
    expect(action).toHaveBeenCalledWith(seed.element, {}, seed.config, "hold");
  });

  it("resolves two rapid taps on the same element to a single double_tap", () => {
    const { card, aim } = makeCard();
    const seed = aim({
      tap_action: { action: "toggle" },
      double_tap_action: { action: "more-info" },
    });
    card._onRoutedEvent(mouse("mousedown"));
    card._onRoutedEvent(mouse("click", { detail: 1 }));
    card._onRoutedEvent(mouse("mousedown"));
    card._onRoutedEvent(mouse("click", { detail: 2 }));
    vi.advanceTimersByTime(300);
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(
      seed.element,
      {},
      seed.config,
      "double_tap"
    );
  });

  it("keeps two elements' double-tap windows independent", () => {
    // Regression: a card-global window made a quick tap on B double_tap and
    // cancel A. Each element must resolve its own tap.
    const dbl = { double_tap_action: { action: "more-info" } };
    const { card, aim } = makeCard();
    const a = aim(dbl);
    card._onRoutedEvent(touch("touchstart"));
    card._onRoutedEvent(touch("touchend")); // arm A's tap
    const b = aim(dbl);
    card._onRoutedEvent(touch("touchstart"));
    card._onRoutedEvent(touch("touchend")); // must NOT become a double_tap
    vi.advanceTimersByTime(300);
    expect(action).toHaveBeenCalledTimes(2);
    expect(action).toHaveBeenCalledWith(a.element, {}, a.config, "tap");
    expect(action).toHaveBeenCalledWith(b.element, {}, b.config, "tap");
  });

  it("suppresses the context menu only for a touch gesture", () => {
    const { card, aim } = makeCard();
    aim({ hold_action: { action: "more-info" } });
    card._onRoutedEvent(mouse("mousedown"));
    const mouseMenu = new MouseEvent("contextmenu", { cancelable: true });
    card._onRoutedEvent(mouseMenu);
    expect(mouseMenu.defaultPrevented).toBe(false);

    card._onRoutedEvent(touch("touchstart"));
    const touchMenu = new MouseEvent("contextmenu", { cancelable: true });
    card._onRoutedEvent(touchMenu);
    expect(touchMenu.defaultPrevented).toBe(true);
  });
});
