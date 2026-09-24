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

// The real formatter can substitute an integration translation for the state,
// so what reaches the cell is not bounded by the raw state's length. Returning
// the state verbatim keeps that length under the test's control.
const formatters = {
  formatEntityState: (stateObj: HassEntity) => stateObj.state,
} as HomeAssistantFormatters;

// Every mount is tracked, not just the last one: a test that mounts twice would
// otherwise leave the first provider host in the document for later tests.
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
  it("renders the formatted state into light DOM", async () => {
    const el = await mount({ "sensor.test": makeEntity("sensor.test", "on") });
    // Light DOM, so `ha-data-table`'s cell can clip the text and read it back
    // for its own hover title. A shadow root would hide both.
    expect(el.shadowRoot).toBeNull();
    expect(el.textContent).toBe("on");
  });

  it("renders an em dash when the entity has no state object", async () => {
    const el = await mount({});
    expect(el.textContent).toBe("—");
  });

  it("caps the cell text at 100 characters and adds no ellipsis of its own", async () => {
    const el = await mount({
      "sensor.test": makeEntity("sensor.test", "x".repeat(400)),
    });
    expect(el.textContent).toBe("x".repeat(100));
  });

  it("carries the dropped text in a marked title", async () => {
    const el = await mount({
      "sensor.test": makeEntity("sensor.test", "x".repeat(400)),
    });
    // 255 characters plus the marker, so a second cut is visible.
    expect(el.getAttribute("title")).toBe(`${"x".repeat(255)}…`);
  });

  it("marks the title only when it actually cut", async () => {
    // A state that fits the title cap keeps every character and gains no
    // marker, so the marker always means something was dropped.
    const el = await mount({
      "sensor.test": makeEntity("sensor.test", "x".repeat(255)),
    });
    expect(el.getAttribute("title")).toBe("x".repeat(255));

    // The helper's guard counts the marker, so the pass-through limit is one
    // character above the cap and 257 is the first length that is cut.
    const cut = await mount({
      "sensor.test": makeEntity("sensor.test", "x".repeat(257)),
    });
    expect(cut.getAttribute("title")).toBe(`${"x".repeat(255)}\u2026`);
  });

  it("leaves no title attribute when nothing was capped", async () => {
    const el = await mount({ "sensor.test": makeEntity("sensor.test", "on") });
    // Not `title=""`: an empty title means "no advisory information" and
    // suppresses the ancestor cell's title, which is what reveals a state
    // clipped by the cell rather than by the cap.
    expect(el.hasAttribute("title")).toBe(false);
  });

  it("drops a stale title when a long state becomes short", async () => {
    const el = await mount({
      "sensor.test": makeEntity("sensor.test", "x".repeat(400)),
    });
    expect(el.hasAttribute("title")).toBe(true);

    el.entityId = "sensor.other";
    await el.updateComplete;
    expect(el.hasAttribute("title")).toBe(false);
  });
});
