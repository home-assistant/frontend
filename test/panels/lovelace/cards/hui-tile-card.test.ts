import { describe, expect, it, vi } from "vitest";
import "../../../../src/panels/lovelace/cards/hui-tile-card";
import "../../../../src/panels/lovelace/editor/config-elements/hui-tile-card-editor";
import type { LovelaceCardFeatureConfig } from "../../../../src/panels/lovelace/card-features/types";
import type {
  LovelaceCard,
  LovelaceGridOptions,
} from "../../../../src/panels/lovelace/types";
import type { TileCardConfig } from "../../../../src/panels/lovelace/cards/types";
import { createMockEntityState, createMockHass } from "../../../fixtures/hass";

vi.mock("../../../../src/components/ha-expansion-panel", () => {
  if (!customElements.get("ha-expansion-panel")) {
    customElements.define("ha-expansion-panel", class extends HTMLElement {});
  }
  return {};
});
vi.mock("../../../../src/components/ha-form/ha-form", () => {
  if (!customElements.get("ha-form")) {
    customElements.define("ha-form", class extends HTMLElement {});
  }
  return {};
});
vi.mock("../../../../src/components/ha-svg-icon", () => {
  if (!customElements.get("ha-svg-icon")) {
    customElements.define("ha-svg-icon", class extends HTMLElement {});
  }
  return {};
});
vi.mock(
  "../../../../src/panels/lovelace/editor/config-elements/hui-card-features-editor",
  () => {
    if (!customElements.get("hui-card-features-editor")) {
      customElements.define(
        "hui-card-features-editor",
        class extends HTMLElement {}
      );
    }
    return { getSupportedFeaturesType: () => [] };
  }
);

// getCardSize() and getGridOptions() drive how much space the tile card claims
// in masonry and sections views. In "inline" mode the first feature shares the
// name row and the remaining features are laid out two per row below it, so the
// counting differs from "bottom" mode; these tests pin that arithmetic down.

// Bundler-defined globals the card's import graph reads at eval time.
vi.hoisted(() => {
  Object.assign(globalThis, {
    __STATIC_PATH__: "/",
    __HASS_URL__: "",
    __BUILD__: "modern",
    __VERSION__: "test",
    __BACKWARDS_COMPAT__: false,
    __SUPERVISOR__: false,
    __NAMESPACE__: "frontend",
  });
});

const features = (count: number): LovelaceCardFeatureConfig[] =>
  Array.from(
    { length: count },
    () => ({ type: "toggle" }) as LovelaceCardFeatureConfig
  );

const makeCard = (config: Partial<TileCardConfig>): LovelaceCard => {
  const card = document.createElement("hui-tile-card") as LovelaceCard;
  card.setConfig({
    type: "tile",
    entity: "light.test",
    ...config,
  } as TileCardConfig);
  return card;
};

describe("hui-tile-card getCardSize", () => {
  it("is 1 for a bare tile", () => {
    expect(makeCard({}).getCardSize()).toBe(1);
  });

  it("adds a row for the vertical layout", () => {
    expect(makeCard({ vertical: true }).getCardSize()).toBe(2);
  });

  it("counts every feature in bottom mode", () => {
    expect(
      makeCard({
        features_position: "bottom",
        features: features(3),
      }).getCardSize()
    ).toBe(4);
  });

  it("pairs the features below the inline one", () => {
    const sizes = [1, 2, 3, 4, 5, 6].map((count) =>
      makeCard({
        features_position: "inline",
        features: features(count),
      }).getCardSize()
    );
    expect(sizes).toEqual([1, 2, 2, 3, 3, 4]);
  });

  it("does not add rows for a single inline feature", () => {
    expect(
      makeCard({
        features_position: "inline",
        features: features(1),
      }).getCardSize()
    ).toBe(1);
  });

  it("does not add rows for inline mode with no features", () => {
    expect(
      makeCard({
        features_position: "inline",
        features: features(0),
      }).getCardSize()
    ).toBe(1);
  });

  it("ignores inline mode when the layout is vertical", () => {
    // vertical forces bottom positioning, so all features are stacked
    expect(
      makeCard({
        vertical: true,
        features_position: "inline",
        features: features(2),
      }).getCardSize()
    ).toBe(4);
  });
});

describe("hui-tile-card getGridOptions", () => {
  const gridOptions = (config: Partial<TileCardConfig>): LovelaceGridOptions =>
    makeCard(config).getGridOptions!();

  it("is a single 6-wide row for a bare tile", () => {
    expect(gridOptions({})).toEqual({
      columns: 6,
      rows: 1,
      min_columns: 6,
      min_rows: 1,
    });
  });

  it("adds one row per feature in bottom mode", () => {
    expect(
      gridOptions({ features_position: "bottom", features: features(3) })
    ).toEqual({
      columns: 6,
      rows: 4,
      min_columns: 6,
      min_rows: 4,
    });
  });

  it("widens to 12 columns and pairs the extra features in inline mode", () => {
    expect(
      gridOptions({ features_position: "inline", features: features(3) })
    ).toEqual({
      columns: 6,
      rows: 2,
      min_columns: 12,
      min_rows: 2,
    });
  });

  it("adds a row per pair of features below the inline one", () => {
    const rows = [1, 2, 3, 4, 5, 6].map(
      (count) =>
        gridOptions({ features_position: "inline", features: features(count) })
          .rows
    );
    expect(rows).toEqual([1, 2, 2, 3, 3, 4]);
  });

  it("keeps a single row for one inline feature", () => {
    expect(
      gridOptions({ features_position: "inline", features: features(1) })
    ).toEqual({
      columns: 6,
      rows: 1,
      min_columns: 12,
      min_rows: 1,
    });
  });

  it("stacks all features and narrows columns in vertical mode", () => {
    // vertical forces bottom positioning and adds its own row
    expect(
      gridOptions({
        vertical: true,
        features_position: "inline",
        features: features(2),
      })
    ).toEqual({
      columns: 6,
      rows: 4,
      min_columns: 3,
      min_rows: 4,
    });
  });
});

describe("hui-tile-card color", () => {
  it.each(["on", "off"])(
    "keeps the icon color constant when the entity is %s",
    async (state) => {
      const card = makeCard({ color: "none" }) as unknown as HTMLElement & {
        hass: ReturnType<typeof createMockHass>;
        updateComplete: Promise<boolean>;
      };
      document.body.append(card);
      card.hass = createMockHass({
        "light.test": createMockEntityState("light.test", state),
      });

      await card.updateComplete;

      expect(
        card.shadowRoot
          ?.querySelector("ha-card")
          ?.style.getPropertyValue("--tile-color")
      ).toBe("var(--state-icon-color)");

      card.remove();
    }
  );
});

describe("hui-tile-card editor", () => {
  it("includes the none color option", async () => {
    const editor = document.createElement(
      "hui-tile-card-editor"
    ) as HTMLElement & {
      hass: ReturnType<typeof createMockHass>;
      setConfig: (config: TileCardConfig) => void;
    };
    const hass = createMockHass({
      "light.test": createMockEntityState("light.test", "on"),
    });
    editor.hass = hass;
    editor.setConfig({ type: "tile", entity: "light.test" });
    document.body.append(editor);

    await editor.updateComplete;

    const form = editor.shadowRoot?.querySelector("ha-form") as HTMLElement & {
      schema: readonly {
        name: string;
        schema?: readonly {
          name: string;
          selector?: { ui_color?: { include_none?: boolean } };
        }[];
      }[];
    };
    const content = form.schema.find((item) => item.name === "content");
    const grid = content?.schema?.find(
      (item) => "type" in item && item.type === "grid"
    ) as
      | {
          schema?: readonly {
            name: string;
            selector?: { ui_color?: { include_none?: boolean } };
          }[];
        }
      | undefined;
    const color = grid?.schema?.find((item) => item.name === "color");

    expect(color?.selector?.ui_color?.include_none).toBe(true);

    editor.remove();
  });
});
