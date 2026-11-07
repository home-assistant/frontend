import { ContextProvider } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { afterEach, describe, expect, it } from "vitest";
import "../../src/components/ha-entity-id-state";
import type { HaEntityIdState } from "../../src/components/ha-entity-id-state";
import { formattersContext, statesContext } from "../../src/data/context";
import type { HomeAssistantFormatters } from "../../src/types";

const makeEntity = (entityId: string, stateValue: string): HassEntity =>
  ({
    entity_id: entityId,
    state: stateValue,
    attributes: {},
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
    context: { id: "", parent_id: null, user_id: null },
  }) as HassEntity;

// Returning the state verbatim keeps its length under the test's control.
const formatters = {
  formatEntityState: (stateObj: HassEntity) => stateObj.state,
} as HomeAssistantFormatters;

const hosts: HTMLDivElement[] = [];

const mount = async (states: Record<string, HassEntity>) => {
  const host = document.createElement("div");
  hosts.push(host);
  document.body.appendChild(host);
  new ContextProvider(host, { context: statesContext, initialValue: states });
  new ContextProvider(host, {
    context: formattersContext,
    initialValue: formatters,
  });
  const el = document.createElement("ha-entity-id-state") as HaEntityIdState;
  el.entityId = "sensor.test";
  host.appendChild(el);
  await el.updateComplete;
  return el;
};

afterEach(() => {
  hosts.forEach((el) => el.remove());
  hosts.length = 0;
});

describe("ha-entity-id-state", () => {
  it("caps the cell text at 100 characters and adds no ellipsis of its own", async () => {
    const el = await mount({
      "sensor.test": makeEntity("sensor.test", "x".repeat(400)),
    });
    expect(el.textContent).toBe("x".repeat(100));
  });

  it("leaves no title attribute when nothing was capped", async () => {
    const el = await mount({ "sensor.test": makeEntity("sensor.test", "on") });
    // `title=""` would suppress the cell's own overflow title.
    expect(el.hasAttribute("title")).toBe(false);
  });

  it("drops a stale title when a long state becomes short", async () => {
    const el = await mount({
      "sensor.test": makeEntity("sensor.test", "x".repeat(400)),
    });
    expect(el.getAttribute("title")).toBe(`${"x".repeat(255)}…`);

    el.entityId = "sensor.other";
    await el.updateComplete;
    expect(el.hasAttribute("title")).toBe(false);
  });
});
