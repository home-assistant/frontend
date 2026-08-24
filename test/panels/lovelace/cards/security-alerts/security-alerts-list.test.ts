import type { HassEntity } from "home-assistant-js-websocket";
import { afterEach, describe, expect, it } from "vitest";
import type { SecurityAlertItem } from "../../../../../src/panels/lovelace/cards/security-alerts/helpers";
import "../../../../../src/panels/lovelace/cards/security-alerts/hui-security-alerts-list";

interface TestSecurityAlertsList extends HTMLElement {
  updateComplete: Promise<boolean>;
  _alerts: SecurityAlertItem[];
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

const alert = (pulse: boolean, color?: string): SecurityAlertItem => {
  const stateObj = state();
  return {
    entityId: stateObj.entity_id,
    stateObj,
    pulse,
    color,
  };
};

const createList = async (alerts: SecurityAlertItem[]) => {
  const element = document.createElement(
    "hui-security-alerts-list"
  ) as unknown as TestSecurityAlertsList;
  element._alerts = alerts;
  element._formatters = { formatEntityState: () => "On" };
  document.body.appendChild(element);
  await element.updateComplete;
  return element;
};

describe("hui-security-alerts-list", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("does not pulse when pulse is disabled", async () => {
    const element = await createList([alert(false)]);

    const card = element.shadowRoot!.querySelector("ha-card")!;

    expect(card.classList.contains("pulse")).toBe(false);
    expect(
      card.style.getPropertyValue("--ha-security-alert-static-opacity")
    ).toBe("var(--ha-security-alert-pulse-opacity)");
  });

  it("pulses when pulse is enabled", async () => {
    const element = await createList([alert(true)]);

    const card = element.shadowRoot!.querySelector("ha-card")!;
    expect(card.classList.contains("pulse")).toBe(true);
  });

  it("applies configured colors", async () => {
    const element = await createList([alert(true, "amber")]);

    const card = element.shadowRoot!.querySelector("ha-card")!;

    expect(card.classList.contains("warning")).toBe(false);
    expect(card.classList.contains("no-color")).toBe(false);
    expect(card.style.getPropertyValue("--ha-security-alert-color")).toBe(
      "var(--amber-color)"
    );
  });

  it("does not apply a color when color is none", async () => {
    const element = await createList([alert(true, "none")]);

    const card = element.shadowRoot!.querySelector("ha-card")!;

    expect(card.classList.contains("warning")).toBe(false);
    expect(card.classList.contains("no-color")).toBe(true);
    expect(card.style.getPropertyValue("--ha-security-alert-color")).toBe("");
  });
});
