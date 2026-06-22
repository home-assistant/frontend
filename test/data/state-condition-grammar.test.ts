import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import en from "../../src/translations/en.json";

// The state condition summary string. Its verb must agree with how the entity
// list is joined: "and" (match "all") takes a plural verb, "or" (match "any")
// takes a singular verb in English.
const message = (en as any).ui.panel.config.automation.editor.conditions.type
  .state.description.full;

const format = (values: Record<string, unknown>) =>
  new IntlMessageFormat(message, "en").format(values) as string;

describe("state condition summary grammar", () => {
  it("uses a singular verb for a single entity", () => {
    expect(
      format({
        hasAttribute: "false",
        numberOfEntities: 1,
        matchAny: "false",
        entities: "Light",
        numberOfStates: 1,
        states: "on",
        hasDuration: "false",
      })
    ).toBe("If Light is on");
  });

  it("uses a plural verb for multiple entities matched with all (and)", () => {
    expect(
      format({
        hasAttribute: "false",
        numberOfEntities: 2,
        matchAny: "false",
        entities: "A and B",
        numberOfStates: 1,
        states: "on",
        hasDuration: "false",
      })
    ).toBe("If A and B are on");
  });

  it("uses a singular verb for multiple entities matched with any (or)", () => {
    expect(
      format({
        hasAttribute: "false",
        numberOfEntities: 2,
        matchAny: "true",
        entities: "A or B",
        numberOfStates: 1,
        states: "on",
        hasDuration: "false",
      })
    ).toBe("If A or B is on");
  });
});
