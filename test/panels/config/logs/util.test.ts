import type { HassConfig } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";

import type { LocalizeFunc } from "../../../../src/common/translations/localize";
import type { LoggedError } from "../../../../src/data/system_log";
import type { FrontendLocaleData } from "../../../../src/data/translation";
import {
  filterSystemLogItems,
  type SystemLogFilters,
} from "../../../../src/panels/config/logs/util";

const entry = (name: string, level: LoggedError["level"]): LoggedError => ({
  name,
  message: [`${name} ${level}`],
  level,
  source: ["file.py", 1],
  exception: "",
  count: 1,
  timestamp: 0,
  first_occurred: 0,
});

const items = [
  entry("homeassistant.components.hue", "error"),
  entry("homeassistant.components.hue.light", "warning"),
  entry("homeassistant.components.mqtt", "error"),
  entry("homeassistant.core", "warning"),
];

const names = (filters: SystemLogFilters) =>
  filterSystemLogItems(
    items,
    filters,
    (() => "") as unknown as LocalizeFunc,
    {} as FrontendLocaleData,
    {} as HassConfig
  ).map((item) => `${item.name} ${item.level}`);

// The errors list and the counts in the filter pane both filter with this.
// Excluding has to show exactly the entries including hides.
describe("filterSystemLogItems", () => {
  it("keeps the entries of the picked integrations and their child loggers", () => {
    expect(
      names({ search: "", loggers: ["homeassistant.components.hue"] })
    ).toEqual([
      "homeassistant.components.hue error",
      "homeassistant.components.hue.light warning",
    ]);
  });

  it("leaves out the picked integrations when excluding them", () => {
    expect(
      names({
        search: "",
        loggers: ["homeassistant.components.hue"],
        excludeLoggers: true,
      })
    ).toEqual([
      "homeassistant.components.mqtt error",
      "homeassistant.core warning",
    ]);
  });

  it("leaves out the picked levels when excluding them", () => {
    expect(
      names({ search: "", levels: ["warning"], excludeLevels: true })
    ).toEqual([
      "homeassistant.components.hue error",
      "homeassistant.components.mqtt error",
    ]);
  });

  it("combines an excluded integration with an included level", () => {
    expect(
      names({
        search: "",
        loggers: ["homeassistant.components.mqtt"],
        excludeLoggers: true,
        levels: ["error"],
      })
    ).toEqual(["homeassistant.components.hue error"]);
  });
});
