import { describe, expect, it } from "vitest";

import {
  normalizeLovelaceConfig,
  normalizeViewConfig,
} from "../../../../src/data/lovelace/config/normalize";
import type { LovelaceRawConfig } from "../../../../src/data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../../../src/data/lovelace/config/view";

const rawConfig = (config: unknown) => config as LovelaceRawConfig;

describe("normalizeLovelaceConfig", () => {
  it("expands badge shorthands into entity badges", () => {
    const config = rawConfig({
      views: [
        {
          badges: [
            "sensor.temperature",
            { entity: "sensor.humidity" },
            { type: "custom:my-badge" },
          ],
        },
      ],
    });

    expect(normalizeLovelaceConfig(config)).toEqual({
      views: [
        {
          badges: [
            { type: "entity", entity: "sensor.temperature", show_name: true },
            { type: "entity", entity: "sensor.humidity" },
            { type: "custom:my-badge" },
          ],
        },
      ],
    });
  });

  it("removes empty entries at every level", () => {
    const config = rawConfig({
      views: [
        null,
        {
          badges: [null, "sensor.temperature"],
          cards: [null, { type: "tile" }],
          sections: [null, { type: "grid", cards: [{ type: "tile" }, null] }],
        },
      ],
    });

    expect(normalizeLovelaceConfig(config)).toEqual({
      views: [
        {
          badges: [
            { type: "entity", entity: "sensor.temperature", show_name: true },
          ],
          cards: [{ type: "tile" }],
          sections: [{ type: "grid", cards: [{ type: "tile" }] }],
        },
      ],
    });
  });

  it("leaves strategies untouched", () => {
    const dashboard = rawConfig({ strategy: { type: "original-states" } });
    expect(normalizeLovelaceConfig(dashboard)).toBe(dashboard);

    const view = { strategy: { type: "areas" } };
    const section = { strategy: { type: "common-controls" } };
    const config = rawConfig({ views: [view, { sections: [section] }] });

    expect(normalizeLovelaceConfig(config)).toEqual({
      views: [view, { sections: [section] }],
    });
  });
});

describe("normalizeViewConfig", () => {
  it("expands badge shorthands in a generated view", () => {
    const view = {
      badges: ["sensor.temperature"],
    } as unknown as LovelaceViewConfig;

    expect(normalizeViewConfig(view)).toEqual({
      badges: [
        { type: "entity", entity: "sensor.temperature", show_name: true },
      ],
    });
  });
});
