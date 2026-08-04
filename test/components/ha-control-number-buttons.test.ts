import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../src/components/ha-control-number-buttons";
import type { HaControlNumberButton } from "../../src/components/ha-control-number-buttons";

class MockResizeObserver {
  observe = vi.fn();

  unobserve = vi.fn();

  disconnect = vi.fn();
}

describe("ha-control-number-buttons step bounds", () => {
  // An input_number with min 1, max 99 and step 10: the step grid does not
  // divide the range, so snapping used to round past both bounds.
  const RANGE = { min: 1, max: 99, step: 10 };

  let buttons: HaControlNumberButton[] = [];

  const mountButtons = async (
    props: Partial<HaControlNumberButton>
  ): Promise<HaControlNumberButton> => {
    const el = document.createElement(
      "ha-control-number-buttons"
    ) as HaControlNumberButton;
    Object.assign(el, props);
    document.body.appendChild(el);
    buttons.push(el);
    await el.updateComplete;
    return el;
  };

  const stepButton = (el: HaControlNumberButton, label: string) =>
    el.shadowRoot!.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;

  const changedValues = (el: HaControlNumberButton) => {
    const values: (number | undefined)[] = [];
    el.addEventListener("value-changed", (ev) => {
      values.push((ev as CustomEvent).detail.value);
    });
    return values;
  };

  const pressKey = async (el: HaControlNumberButton, code: string) => {
    el.shadowRoot!.querySelector('[role="spinbutton"]')!.dispatchEvent(
      new KeyboardEvent("keydown", {
        code,
        bubbles: true,
        composed: true,
        cancelable: true,
      })
    );
    await el.updateComplete;
  };

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    buttons.forEach((el) => el.remove());
    buttons = [];
    vi.unstubAllGlobals();
  });

  it("stops at the maximum instead of stepping past it", async () => {
    const el = await mountButtons({ ...RANGE, value: 91 });
    const values = changedValues(el);
    stepButton(el, "increment").click();
    await el.updateComplete;
    expect(values).toEqual([99]);
    expect(stepButton(el, "increment").disabled).toBe(true);
  });

  it("stops at the minimum instead of stepping past it", async () => {
    const el = await mountButtons({ ...RANGE, value: 11 });
    const values = changedValues(el);
    stepButton(el, "decrement").click();
    await el.updateComplete;
    expect(values).toEqual([1]);
    expect(stepButton(el, "decrement").disabled).toBe(true);
  });

  it("still snaps to the step grid away from the bounds", async () => {
    const el = await mountButtons({ ...RANGE, value: 44 });
    const values = changedValues(el);
    stepButton(el, "increment").click();
    stepButton(el, "decrement").click();
    await el.updateComplete;
    expect(values).toEqual([50, 40]);
  });

  it("steps without bounds when min and max are not set", async () => {
    const el = await mountButtons({ step: 10, value: 50 });
    const values = changedValues(el);
    stepButton(el, "increment").click();
    await el.updateComplete;
    expect(values).toEqual([60]);
  });

  it("pages by ten percent of the range, but at least one step", async () => {
    const wide = await mountButtons({ min: 10, max: 20, step: 1, value: 15 });
    const wideValues = changedValues(wide);
    await pressKey(wide, "PageUp");
    expect(wideValues).toEqual([16]);

    // A range narrower than ten steps must still page by a full step.
    const narrow = await mountButtons({ min: 0, max: 5, step: 2, value: 0 });
    const narrowValues = changedValues(narrow);
    await pressKey(narrow, "PageUp");
    expect(narrowValues).toEqual([2]);
  });
});
