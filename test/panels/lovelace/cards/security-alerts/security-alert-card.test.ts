import type { HassEntity } from "home-assistant-js-websocket";
import { afterEach, describe, expect, it } from "vitest";
import type {
  SecurityAlertHass,
  SecurityAlertItem,
} from "../../../../../src/panels/lovelace/cards/security-alerts/helpers";
import type { SecurityAlertCardConfig } from "../../../../../src/panels/lovelace/cards/types";
import "../../../../../src/panels/lovelace/cards/security-alerts/hui-security-alert-card";

interface TestSecurityAlertCard extends HTMLElement {
  updateComplete: Promise<boolean>;
  alert?: SecurityAlertItem;
  preview: boolean;
  setConfig(config: SecurityAlertCardConfig): void;
  getCardSize(): number;
  getGridOptions(): {
    columns?: number | "full";
    rows?: number | "auto";
    min_columns?: number;
    min_rows?: number;
  };
  _states?: Record<string, HassEntity>;
  _hassConfig: Pick<SecurityAlertHass, "config" | "user">;
  _i18n: Pick<SecurityAlertHass, "locale">;
  _formatters: {
    formatEntityState: (stateObj: HassEntity) => string;
  };
}

const state = (value = "on"): HassEntity => ({
  entity_id: "binary_sensor.window",
  state: value,
  attributes: {
    device_class: "window",
    friendly_name: "Window",
  },
  last_changed: "2026-01-01T00:00:00Z",
  last_updated: "2026-01-01T00:00:00Z",
  context: { id: "", parent_id: null, user_id: null },
});

const alert = (pulse: boolean, color?: string): SecurityAlertItem => {
  const stateObj = state();
  return {
    entityId: stateObj.entity_id,
    stateObj,
    pulse,
    color,
  };
};

const createCard = async (item: SecurityAlertItem) => {
  const element = document.createElement(
    "hui-security-alert-card"
  ) as unknown as TestSecurityAlertCard;
  element.alert = item;
  element._formatters = { formatEntityState: () => "On" };
  document.body.appendChild(element);
  await element.updateComplete;
  return element;
};

const createConfiguredCard = async (
  config: SecurityAlertCardConfig,
  stateObj = state(),
  preview = false
) => {
  const element = document.createElement(
    "hui-security-alert-card"
  ) as unknown as TestSecurityAlertCard;
  element.setConfig(config);
  element.preview = preview;
  element._states = { [stateObj.entity_id]: stateObj };
  element._hassConfig = {
    config: { time_zone: "UTC" } as SecurityAlertHass["config"],
    user: undefined,
  };
  element._i18n = {
    locale: { time_zone: "server" } as SecurityAlertHass["locale"],
  };
  element._formatters = { formatEntityState: () => "On" };
  document.body.appendChild(element);
  await element.updateComplete;
  await element.updateComplete;
  return element;
};

const config = (
  overrides: Partial<SecurityAlertCardConfig> = {}
): SecurityAlertCardConfig => ({
  type: "security-alert",
  entity: "binary_sensor.window",
  ...overrides,
});

describe("hui-security-alert-card", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("validates manual state-only configuration", () => {
    const element = document.createElement("hui-security-alert-card");

    expect(() =>
      element.setConfig(
        config({
          visibility: [
            {
              condition: "state",
              entity: "binary_sensor.window",
              state: "on",
            },
          ],
        })
      )
    ).not.toThrow();
    expect(() =>
      element.setConfig({
        type: "security-alert",
        entity: "binary_sensor.window",
        visibility: [{ condition: "screen", media_query: "(min-width: 1px)" }],
      } as unknown as SecurityAlertCardConfig)
    ).toThrow("Invalid configuration");
    expect(() =>
      element.setConfig({
        type: "security-alert",
        entity: "binary_sensor.window",
        visibility: "on",
      } as unknown as SecurityAlertCardConfig)
    ).toThrow("Invalid configuration");
  });

  it("renders from manual configuration", async () => {
    const element = await createConfiguredCard(
      config({ color: "amber", pulse: false })
    );
    const card = element.shadowRoot!.querySelector("ha-card")!;

    expect(card.classList.contains("pulse")).toBe(false);
    expect(card.style.getPropertyValue("--ha-security-alert-color")).toBe(
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

  it("hides when manual visibility does not match", async () => {
    const element = document.createElement(
      "hui-security-alert-card"
    ) as unknown as TestSecurityAlertCard;
    let visible: boolean | undefined;
    element.addEventListener("card-visibility-changed", (ev) => {
      visible = ev.detail.value;
    });
    element.setConfig(config());
    element._states = { "binary_sensor.window": state("off") };
    element._hassConfig = {
      config: { time_zone: "UTC" } as SecurityAlertHass["config"],
      user: undefined,
    };
    element._i18n = {
      locale: { time_zone: "server" } as SecurityAlertHass["locale"],
    };
    element._formatters = { formatEntityState: () => "Off" };
    document.body.appendChild(element);
    await element.updateComplete;
    await element.updateComplete;

    expect(element.hidden).toBe(true);
    expect(element.shadowRoot!.querySelector("ha-card")).toBeNull();
    expect(visible).toBe(false);
  });

  it("renders non-matching manual configuration in preview", async () => {
    const element = await createConfiguredCard(config(), state("off"), true);

    expect(element.hidden).toBe(false);
    expect(element.shadowRoot!.querySelector("ha-card")).not.toBeNull();
  });

  it("does not pulse when pulse is disabled", async () => {
    const element = await createCard(alert(false));
    const card = element.shadowRoot!.querySelector("ha-card")!;

    expect(card.classList.contains("pulse")).toBe(false);
    expect(
      card.style.getPropertyValue("--ha-security-alert-static-opacity")
    ).toBe("var(--ha-security-alert-pulse-opacity)");
  });

  it("pulses when pulse is enabled", async () => {
    const element = await createCard(alert(true));
    const card = element.shadowRoot!.querySelector("ha-card")!;

    expect(card.classList.contains("pulse")).toBe(true);
  });

  it("applies configured colors", async () => {
    const element = await createCard(alert(true, "amber"));
    const card = element.shadowRoot!.querySelector("ha-card")!;

    expect(card.classList.contains("warning")).toBe(false);
    expect(card.classList.contains("no-color")).toBe(false);
    expect(card.style.getPropertyValue("--ha-security-alert-color")).toBe(
      "var(--amber-color)"
    );
  });

  it("does not apply a color when color is none", async () => {
    const element = await createCard(alert(true, "none"));
    const card = element.shadowRoot!.querySelector("ha-card")!;

    expect(card.classList.contains("warning")).toBe(false);
    expect(card.classList.contains("no-color")).toBe(true);
    expect(card.style.getPropertyValue("--ha-security-alert-color")).toBe("");
  });

  it("opens more info on tap", async () => {
    const element = await createCard(alert(true));
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
