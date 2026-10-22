import { html } from "lit";
import { afterEach, describe, expect, it } from "vitest";
import type { HaTimeline } from "../../../src/components/trace/ha-timeline";
import "../../../src/components/trace/ha-timeline";
import type { HomeAssistant } from "../../../src/types";

const hass = {
  localize: (key: string, values?: Record<string, unknown>) =>
    `${key}|${values?.count}`,
} as unknown as HomeAssistant;

let element: HaTimeline | undefined;

const mount = async (properties: Partial<HaTimeline>) => {
  element = document.createElement("ha-timeline");
  Object.assign(element, properties);
  document.body.append(element);
  await element.updateComplete;
  return element;
};

afterEach(() => {
  element?.remove();
  element = undefined;
});

describe("ha-timeline", () => {
  it("shows a translated button for the hidden items", async () => {
    const timeline = await mount({
      hass,
      moreItems: [html`a`, html`b`, html`c`],
    });

    const button = timeline.shadowRoot!.querySelector("button.link");
    expect(button?.textContent?.trim()).toBe(
      "ui.panel.config.automation.trace.messages.show_more_items|3"
    );
  });

  it("shows a single hidden item directly", async () => {
    const timeline = await mount({ hass, moreItems: [html`only item`] });

    expect(timeline.shadowRoot!.querySelector("button.link")).toBeNull();
    expect(timeline.shadowRoot!.textContent).toContain("only item");
  });

  it("shows all items after clicking the button", async () => {
    const timeline = await mount({
      hass,
      moreItems: [html`first`, html`second`],
    });

    timeline
      .shadowRoot!.querySelector<HTMLButtonElement>("button.link")!
      .click();
    await timeline.updateComplete;

    expect(timeline.shadowRoot!.querySelector("button.link")).toBeNull();
    expect(timeline.shadowRoot!.textContent).toContain("first");
    expect(timeline.shadowRoot!.textContent).toContain("second");
  });
});

describe("show_more_items translation", () => {
  it("has an English string with the count placeholder", async () => {
    const en = (await import("../../../src/translations/en.json")).default;
    expect(en.ui.panel.config.automation.trace.messages.show_more_items).toBe(
      "Show {count} more items"
    );
  });
});
