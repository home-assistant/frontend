import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeaturePosition,
  MapCardFeatureConfig,
} from "../types";

export interface CardFeatureLayout {
  inline: LovelaceCardFeatureConfig[];
  below: LovelaceCardFeatureConfig[];
  /** Columns filled by the below features, 0 when there are none */
  columns: number;
}

const INLINE_COLUMNS = 2;

export const computeCardFeatureLayout = (
  features: LovelaceCardFeatureConfig[] | undefined,
  position: LovelaceCardFeaturePosition
): CardFeatureLayout => {
  if (position !== "inline") {
    return { inline: [], below: features ?? [], columns: 1 };
  }
  const inline = features?.slice(0, 1) ?? [];
  const below = features?.slice(1) ?? [];
  return { inline, below, columns: Math.min(below.length, INLINE_COLUMNS) };
};

export const computeCardFeatureRows = (
  features: LovelaceCardFeatureConfig[] | undefined,
  position: LovelaceCardFeaturePosition
): number => {
  const { inline, below, columns } = computeCardFeatureLayout(
    features,
    position
  );
  const cols = Math.max(columns, 1);
  let belowRows = 0;
  for (let i = 0; i < below.length; i += cols) {
    const rowFeatures = below.slice(i, i + cols);
    const rowHeight = Math.max(
      ...rowFeatures.map((f) =>
        f.type === "map"
          ? Math.max(2, (f as MapCardFeatureConfig).rows ?? 3)
          : 1
      )
    );
    belowRows += rowHeight;
  }

  const inlineMap = inline.find((f) => f.type === "map") as
    MapCardFeatureConfig | undefined;
  const inlineExtraRows = inlineMap
    ? Math.max(0, Math.max(2, inlineMap.rows ?? 2) - 1)
    : 0;

  return belowRows + inlineExtraRows;
};
