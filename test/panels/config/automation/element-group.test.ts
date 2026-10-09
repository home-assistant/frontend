import { describe, expect, it } from "vitest";
import { DYNAMIC_PREFIX } from "../../../../src/data/automation";
import { CONDITION_COLLECTIONS } from "../../../../src/data/condition";
import { TRIGGER_COLLECTIONS } from "../../../../src/data/trigger";
import { findElementGroupKey } from "../../../../src/panels/config/automation/add-automation-element/element-group";

describe("findElementGroupKey", () => {
  const forTrigger = (key: string) =>
    findElementGroupKey("trigger", TRIGGER_COLLECTIONS, key);

  it("puts a member of a curated group in that group", () => {
    expect(forTrigger("state")).toBe("entity");
    expect(forTrigger("numeric_state")).toBe("entity");
    expect(forTrigger("time_pattern")).toBe("time");
  });

  it("strips the dynamic prefix a backend element carries", () => {
    // The domain lives in what the prefix prefixes; reading it off the raw key
    // gives "__DYNAMIC__sun" and matches nothing.
    expect(forTrigger(`${DYNAMIC_PREFIX}sun.sunrise`)).toBe("sun");
    expect(forTrigger(`${DYNAMIC_PREFIX}calendar.event`)).toBe("time");
  });

  it("falls back to the generated group for a domain no group curates", () => {
    expect(forTrigger(`${DYNAMIC_PREFIX}light.turned_on`)).toBe(
      `${DYNAMIC_PREFIX}light`
    );
  });

  it("gives an element that is a row of its own no other category", () => {
    // Nothing curates these, so they resolve to a generated group that is not
    // rendered — the dialog shows no category beside them.
    expect(forTrigger("template")).toBe(`${DYNAMIC_PREFIX}template`);
    expect(forTrigger("webhook")).toBe(`${DYNAMIC_PREFIX}webhook`);
  });

  it("reads a condition's domain with the condition helper", () => {
    expect(
      findElementGroupKey("condition", CONDITION_COLLECTIONS, "numeric_state")
    ).toBe("entity");
  });
});
