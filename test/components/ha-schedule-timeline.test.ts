import { ContextProvider } from "@lit/context";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import "../../src/components/ha-schedule-timeline";
import type { HaScheduleTimeline } from "../../src/components/ha-schedule-timeline";
import { internationalizationContext } from "../../src/data/context";
import type { ScheduleWeek } from "../../src/data/schedule";
import { getScheduleWeek } from "../../src/data/schedule";
import { TimeFormat } from "../../src/data/translation";
import type { HomeAssistantInternationalization } from "../../src/types";
import { mockLocale, mockLocalize } from "../fixtures/hass";

const I18N = {
  localize: mockLocalize,
  language: "en",
  locale: { ...mockLocale, time_format: TimeFormat.twenty_four },
} as HomeAssistantInternationalization;

// One track pixel per minute keeps the pointer math easy to follow.
const TRACK_RECT = {
  left: 0,
  right: 1440,
  width: 1440,
  top: 0,
  bottom: 40,
  height: 40,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

const week = (): ScheduleWeek =>
  getScheduleWeek({ monday: [{ from: "08:00", to: "10:00" }] });

let hosts: HTMLElement[] = [];

const mountTimeline = async (value: ScheduleWeek) => {
  const host = document.createElement("div");
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: I18N,
  });
  const el = document.createElement(
    "ha-schedule-timeline"
  ) as HaScheduleTimeline;
  el.value = value;
  host.appendChild(el);
  document.body.appendChild(host);
  hosts.push(host);
  await el.updateComplete;
  const track = el.shadowRoot!.querySelector<HTMLElement>(
    '.track[data-day="monday"]'
  )!;
  track.getBoundingClientRect = () => TRACK_RECT;
  track.setPointerCapture = vi.fn();
  return { el, track };
};

const pointer = (
  target: Element,
  type: string,
  clientX: number,
  origin: Element = target
) => {
  const ev = new MouseEvent(type, {
    bubbles: true,
    composed: true,
    clientX,
    button: 0,
  });
  Object.defineProperty(ev, "pointerId", { value: 1 });
  // Pointer capture sends move and up events to the track, but the press
  // starts on whatever element is under the pointer.
  Object.defineProperty(ev, "target", { value: origin });
  target.dispatchEvent(ev);
};

beforeAll(() => {
  // jsdom's ElementInternals lacks the validity API used by the
  // webawesome button in the day menu.
  const internalsProto = window.ElementInternals.prototype as any;
  internalsProto.setValidity = vi.fn();
  internalsProto.setFormValue = vi.fn();
  Object.defineProperty(internalsProto, "validity", {
    get: () => ({ valid: true }),
    configurable: true,
  });
});

afterEach(() => {
  hosts.forEach((host) => host.remove());
  hosts = [];
});

describe("ha-schedule-timeline dragging", () => {
  it("keeps a drag when the parent passes an equal week mid-drag", async () => {
    const { el, track } = await mountTimeline(week());
    const block = track.querySelector(".block")!;
    const changed = vi.fn();
    el.addEventListener("value-changed", (ev) =>
      changed((ev as CustomEvent).detail.value)
    );

    pointer(track, "pointerdown", 540, block);
    pointer(track, "pointermove", 600);
    // Hosts set their properties again on every hass update.
    el.value = week();
    await el.updateComplete;
    pointer(track, "pointerup", 600);

    expect(changed).toHaveBeenCalledOnce();
    expect(changed.mock.calls[0][0].monday).toEqual([
      { from: "09:00", to: "11:00" },
    ]);
  });

  it("cancels a drag when the dragged day changes from outside", async () => {
    const { el, track } = await mountTimeline(week());
    const block = track.querySelector(".block")!;
    const changed = vi.fn();
    el.addEventListener("value-changed", changed);

    pointer(track, "pointerdown", 540, block);
    pointer(track, "pointermove", 600);
    el.value = getScheduleWeek({ monday: [] });
    await el.updateComplete;
    pointer(track, "pointerup", 600);

    expect(changed).not.toHaveBeenCalled();
  });
});
