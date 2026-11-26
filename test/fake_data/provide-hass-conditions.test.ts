import { describe, expect, it } from "vitest";

import type { Condition } from "../../src/data/automation";
import type { MockHomeAssistant } from "../../src/fake_data/provide_hass";
import { provideHass } from "../../src/fake_data/provide_hass";

type Host = HTMLElement & { hass?: Partial<MockHomeAssistant> };

// `ownUpdateHass` replaces updateHass as the full demo does, see
// demo/src/ha-demo.ts
const setup = (ownUpdateHass = false) => {
  const host: Host = document.createElement("div");

  const overrides: Partial<MockHomeAssistant> = ownUpdateHass
    ? {
        updateHass: (update: Partial<MockHomeAssistant>) => {
          host.hass = { ...host.hass, ...update };
        },
      }
    : {};

  const hass = provideHass(host, overrides);

  hass.addEntities([
    { entity_id: "light.kitchen", state: "on", attributes: {} },
    { entity_id: "light.hallway", state: "off", attributes: {} },
  ]);

  return hass;
};

const subscribe = async (hass: MockHomeAssistant, condition: Condition) => {
  const messages: unknown[] = [];

  await hass.connection.subscribeMessage(
    (message) => {
      messages.push(message);
    },
    { type: "subscribe_condition", condition }
  );

  return messages;
};

const kitchenOn: Condition = {
  condition: "state",
  entity_id: "light.kitchen",
  state: "on",
};

const hallwayOn: Condition = {
  condition: "state",
  entity_id: "light.hallway",
  state: "on",
};

describe("subscribe_condition in the mock backend", () => {
  it.each([
    ["its own", false],
    ["the host's", true],
  ])(
    "checks a condition again when a state changes, with %s updateHass",
    async (_name, ownUpdateHass) => {
      const hass = setup(ownUpdateHass);
      const messages = await subscribe(hass, hallwayOn);

      hass.addEntities({
        entity_id: "light.hallway",
        state: "on",
        attributes: {},
      });

      expect(messages).toEqual([{ result: false }, { result: true }]);
    }
  );

  it("passes a not only when none of its conditions pass, as in Core", async () => {
    const hass = setup();

    expect(
      await subscribe(hass, {
        condition: "not",
        conditions: [kitchenOn, hallwayOn],
      })
    ).toEqual([{ result: false }]);
  });

  it("skips disabled conditions", async () => {
    const hass = setup();

    expect(
      await subscribe(hass, {
        condition: "and",
        conditions: [kitchenOn, { ...hallwayOn, enabled: false }],
      })
    ).toEqual([{ result: true }]);
  });

  it("answers a not around a template with an error", async () => {
    const hass = setup();

    const [message] = await subscribe(hass, {
      condition: "not",
      conditions: [{ condition: "template", value_template: "{{ true }}" }],
    });

    expect(message).toHaveProperty("error");
  });
});
