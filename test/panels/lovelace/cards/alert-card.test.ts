import { ContextProvider } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { afterEach, describe, expect, it } from "vitest";
import { statesContext } from "../../../../src/data/context";
import "../../../../src/panels/lovelace/cards/hui-alert-card";
import type { AlertCardConfig } from "../../../../src/panels/lovelace/cards/types";

interface TestAlertCard extends HTMLElement {
  updateComplete: Promise<boolean>;
  setConfig(config: AlertCardConfig): void;
  getCardSize(): number;
  getGridOptions(): {
    columns?: number | "full";
    rows?: number | "auto";
    min_columns?: number;
    min_rows?: number;
  };
  _formatters: {
    formatEntityState: (stateObj: HassEntity) => string;
  };
}

const state = (): HassEntity => ({
  entity_id: "binary_sensor.window",
  state: "on",
  attributes: {
    device_class: "window",
    friendly_name: "Window",
  },
  last_changed: "2026-01-01T00:00:00Z",
  last_updated: "2026-01-01T00:00:00Z",
  context: { id: "", parent_id: null, user_id: null },
});

const config = (overrides: Partial<AlertCardConfig> = {}): AlertCardConfig => ({
  type: "alert",
  entity: "binary_sensor.window",
  ...overrides,
});

const createCard = async (cardConfig = config(), stateObj = state()) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ContextProvider(host, {
    context: statesContext,
    initialValue: { [stateObj.entity_id]: stateObj },
  });
  const element = document.createElement(
    "hui-alert-card"
  ) as unknown as TestAlertCard;
  element.setConfig(cardConfig);
  element._formatters = { formatEntityState: () => "On" };
  host.appendChild(element);
  await element.updateComplete;
  return element;
};

describe("hui-alert-card", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it.each([
    { entity: "" },
    { entity: "window" },
    { entity: "binary_sensor.window", color: 123 },
    { entity: "binary_sensor.window", pulse: "true" },
  ])("rejects invalid configuration %#", (invalidConfig) => {
    const element = document.createElement("hui-alert-card");

    expect(() =>
      element.setConfig({
        type: "alert",
        ...invalidConfig,
      } as unknown as AlertCardConfig)
    ).toThrow("Invalid configuration");
  });

  it("renders the configured entity", async () => {
    const element = await createCard(config({ color: "amber", pulse: false }));
    const card = element.shadowRoot!.querySelector("ha-card")!;

    expect(element.shadowRoot!.textContent).toContain("Window");
    expect(card.classList.contains("pulse")).toBe(false);
    expect(card.style.getPropertyValue("--ha-alert-color")).toBe(
      "var(--amber-color)"
    );
    expect(element.getCardSize()).toBe(1);
    expect(element.getGridOptions()).toEqual({
      columns: 6,
      rows: 1,
      min_columns: 6,
      min_rows: 1,
    });
  });

  it("does not render without an entity state", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    new ContextProvider(host, {
      context: statesContext,
      initialValue: {},
    });
    const element = document.createElement(
      "hui-alert-card"
    ) as unknown as TestAlertCard;
    element.setConfig(config());
    element._formatters = { formatEntityState: () => "On" };
    host.appendChild(element);
    await element.updateComplete;

    expect(element.shadowRoot!.querySelector("ha-card")).toBeNull();
  });

  it("pulses by default", async () => {
    const element = await createCard();

    expect(
      element.shadowRoot!.querySelector("ha-card")!.classList.contains("pulse")
    ).toBe(true);
  });

  it("does not apply a color when color is none", async () => {
    const element = await createCard(config({ color: "none" }));
    const card = element.shadowRoot!.querySelector("ha-card")!;

    expect(card.classList.contains("no-color")).toBe(true);
    expect(card.style.getPropertyValue("--ha-alert-color")).toBe("");
  });

  it("opens more info on tap", async () => {
    const element = await createCard();
    let entityId: string | undefined;
    element.addEventListener("hass-more-info", (ev) => {
      entityId = ev.detail.entityId;
    });

    element.shadowRoot!.querySelector("ha-tile-container")!.dispatchEvent(
      new CustomEvent("action", {
        bubbles: true,
        composed: true,
        detail: { action: "tap" },
      })
    );

    expect(entityId).toBe("binary_sensor.window");
  });
});
