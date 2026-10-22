import { IntlMessageFormat } from "intl-messageformat";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Condition, Trigger } from "../../src/data/automation";
import {
  describeCondition,
  describeTrigger,
} from "../../src/data/automation_i18n";
import type { Action } from "../../src/data/script";
import { describeAction } from "../../src/data/script_i18n";
import en from "../../src/translations/en.json";
import type { HomeAssistant } from "../../src/types";

type TranslationNode = string | { [key: string]: TranslationNode };

const translate = (key: string, values?: Record<string, unknown>) => {
  const message = key
    .split(".")
    .reduce<TranslationNode | undefined>(
      (translations, part) =>
        typeof translations === "object" ? translations[part] : undefined,
      en as TranslationNode
    );
  return typeof message === "string"
    ? (new IntlMessageFormat(message, "en").format(values) as string)
    : "";
};

const localize = vi.fn(translate);

const hass = {
  localize,
  states: {},
} as unknown as HomeAssistant;

// A config that makes the describe helpers throw.
const broken = null as unknown;

describe("describe error messages", () => {
  beforeEach(() => {
    localize.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("translates the error for a trigger", () => {
    const description = describeTrigger(broken as Trigger, hass, []);

    expect(localize).toHaveBeenCalledWith(
      "ui.panel.config.automation.editor.triggers.describe_error",
      { error: expect.any(String) }
    );
    expect(description).toMatch(/^Error in describing trigger: .+/);
  });

  it("translates the error for a condition", () => {
    const description = describeCondition(broken as Condition, hass, []);

    expect(localize).toHaveBeenCalledWith(
      "ui.panel.config.automation.editor.conditions.describe_error",
      { error: expect.any(String) }
    );
    expect(description).toMatch(/^Error in describing condition: .+/);
  });

  it("translates the error for an action", () => {
    const description = describeAction(hass, [], broken as Action);

    expect(localize).toHaveBeenCalledWith(
      "ui.panel.config.automation.editor.actions.describe_error",
      { error: expect.any(String) }
    );
    expect(description).toMatch(/^Error in describing action: .+/);
  });
});
