import { describe, expect, it } from "vitest";
import {
  computeCardFeatureLayout,
  computeCardFeatureRows,
} from "../../../../../src/panels/lovelace/card-features/common/feature-layout";
import type { LovelaceCardFeatureConfig } from "../../../../../src/panels/lovelace/card-features/types";

const features = (count: number): LovelaceCardFeatureConfig[] =>
  Array.from({ length: count }, () => ({ type: "toggle" }) as const);

describe("computeCardFeatureLayout", () => {
  it("stacks every feature in bottom position", () => {
    const layout = computeCardFeatureLayout(features(3), "bottom");
    expect(layout.inline).toHaveLength(0);
    expect(layout.below).toHaveLength(3);
    expect(layout.columns).toBe(1);
  });

  it("handles a missing feature list", () => {
    expect(computeCardFeatureLayout(undefined, "inline")).toEqual({
      inline: [],
      below: [],
      columns: 0,
    });
  });

  it("puts the first feature inline and stacks the rest", () => {
    const configs: LovelaceCardFeatureConfig[] = [
      { type: "toggle" },
      { type: "cover-open-close" },
      { type: "cover-position" },
    ];
    const layout = computeCardFeatureLayout(configs, "inline");
    expect(layout.inline).toEqual([configs[0]]);
    expect(layout.below).toEqual([configs[1], configs[2]]);
  });

  it("fills no column when the inline feature is alone", () => {
    expect(computeCardFeatureLayout(features(1), "inline").columns).toBe(0);
  });

  it("fills one column for a single feature below", () => {
    expect(computeCardFeatureLayout(features(2), "inline").columns).toBe(1);
  });

  it("caps the features below at two columns", () => {
    expect(computeCardFeatureLayout(features(5), "inline").columns).toBe(2);
  });

  it("caps the columns to the given maximum", () => {
    expect(computeCardFeatureLayout(features(5), "inline", 1).columns).toBe(1);
  });
});

describe("computeCardFeatureRows", () => {
  it("counts one row per feature in bottom position", () => {
    const rows = [0, 1, 2, 3].map((count) =>
      computeCardFeatureRows(features(count), "bottom")
    );
    expect(rows).toEqual([0, 1, 2, 3]);
  });

  it("pairs the features below the inline one", () => {
    const rows = [0, 1, 2, 3, 4, 5, 6].map((count) =>
      computeCardFeatureRows(features(count), "inline")
    );
    expect(rows).toEqual([0, 0, 1, 1, 2, 2, 3]);
  });

  it("counts one row per feature below when capped to one column", () => {
    const rows = [0, 1, 2, 3, 4].map((count) =>
      computeCardFeatureRows(features(count), "inline", 1)
    );
    expect(rows).toEqual([0, 0, 1, 2, 3]);
  });
});
