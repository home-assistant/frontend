import { ContextProvider } from "@lit/context";
import { afterEach, describe, expect, it } from "vitest";
import { securityAlertsContext } from "../../../../../src/panels/lovelace/cards/security-alerts/context";
import type { SecurityAlertItem } from "../../../../../src/panels/lovelace/cards/security-alerts/helpers";
import "../../../../../src/panels/lovelace/cards/security-alerts/hui-security-alerts-list";

interface TestSecurityAlertsList extends HTMLElement {
  updateComplete: Promise<boolean>;
}

interface TestSecurityAlertCard extends HTMLElement {
  updateComplete: Promise<boolean>;
  alert: SecurityAlertItem;
  _formatters: {
    formatEntityState: () => string;
  };
}

const state = () => ({
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
  const host = document.createElement("div");
  document.body.appendChild(host);
  const provider = new ContextProvider(host, {
    context: securityAlertsContext,
    initialValue: alerts,
  });
  const element = document.createElement(
    "hui-security-alerts-list"
  ) as unknown as TestSecurityAlertsList;
  host.appendChild(element);
  await element.updateComplete;
  return { element, provider };
};

describe("hui-security-alerts-list", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("renders standalone cards from alert context", async () => {
    const alerts = [alert(true, "amber"), alert(false, "none")];
    const { element, provider } = await createList(alerts);
    let cards = element.shadowRoot!.querySelectorAll(
      "hui-security-alert-card"
    ) as unknown as NodeListOf<TestSecurityAlertCard>;
    cards.forEach((card) => {
      card._formatters = { formatEntityState: () => "On" };
    });
    await Promise.all(Array.from(cards, (card) => card.updateComplete));

    expect(cards).toHaveLength(2);
    expect(cards[0].alert).toBe(alerts[0]);
    expect(cards[1].alert).toBe(alerts[1]);

    const replacementAlert = alert(true, "red");
    provider.setValue([replacementAlert]);
    await element.updateComplete;
    cards = element.shadowRoot!.querySelectorAll(
      "hui-security-alert-card"
    ) as unknown as NodeListOf<TestSecurityAlertCard>;
    expect(cards).toHaveLength(1);
    expect(cards[0].alert).toBe(replacementAlert);
  });
});
