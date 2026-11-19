import { ContextProvider } from "@lit/context";
import { afterEach, describe, expect, it } from "vitest";
import { internationalizationContext } from "../../../src/data/context";
import type { HomeAssistantInternationalization } from "../../../src/types";
import type { HaTimeDuration } from "../../../src/components/ha-selector/ha-selector-duration";
import "../../../src/components/ha-selector/ha-selector-duration";

const mountSelector = async (label?: string) => {
  const host = document.createElement("div");
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: {
      localize: (key: string) => key,
      locale: { language: "en" },
    } as unknown as HomeAssistantInternationalization,
  });

  const selector = document.createElement(
    "ha-selector-duration"
  ) as HaTimeDuration;
  selector.selector = { duration: { mode: "offset", label } };
  selector.value = { hours: 1 };
  host.append(selector);
  document.body.append(host);
  await selector.updateComplete;
  await selector.updateComplete;
  return selector;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("ha-selector-duration", () => {
  it("uses the configured label for the offset duration", async () => {
    const selector = await mountSelector("Time offset");

    expect(selector.shadowRoot?.querySelector(".value-label")?.textContent).toBe(
      "Time offset*"
    );
  });

  it("uses the translated default label when no label is configured", async () => {
    const selector = await mountSelector();

    expect(selector.shadowRoot?.querySelector(".value-label")?.textContent).toBe(
      "ui.components.selectors.duration.duration*"
    );
  });
});
