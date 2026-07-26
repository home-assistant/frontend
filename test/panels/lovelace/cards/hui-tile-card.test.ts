import { describe, expect, it, vi } from "vitest";
import "../../../../src/panels/lovelace/cards/hui-tile-card";
import type { LovelaceCardFeatureConfig } from "../../../../src/panels/lovelace/card-features/types";
import type {
  LovelaceCard,
  LovelaceGridOptions,
} from "../../../../src/panels/lovelace/types";
import type { TileCardConfig } from "../../../../src/panels/lovelace/cards/types";

// getCardSize() and getGridOptions() drive how much space the tile card claims
// in masonry and sections views. In "inline" mode the first feature shares the
// name row and only the remaining features add rows, so the counting differs
// from "bottom" mode; these tests pin that arithmetic down.

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

  it("counts all but the inline feature in inline mode", () => {
    expect(
      makeCard({
        features_position: "inline",
        features: features(3),
      }).getCardSize()
    ).toBe(3);
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

  it("widens to 12 columns and stacks the extra features in inline mode", () => {
    expect(
      gridOptions({ features_position: "inline", features: features(3) })
    ).toEqual({
      columns: 6,
      rows: 3,
      min_columns: 12,
      min_rows: 3,
    });
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
