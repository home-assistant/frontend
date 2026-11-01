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
  const extraRows = below.reduce((acc, f) => {
    if (f.type === "map") {
      const mapConfig = f as MapCardFeatureConfig;
      const rows = Math.max(2, mapConfig.rows ?? 3);
      return acc + Math.max(0, rows - 1);
    }
    return acc;
  }, 0);
  const belowRows = Math.ceil(below.length / Math.max(columns, 1)) + extraRows;

  const inlineMap = inline.find((f) => f.type === "map") as
    MapCardFeatureConfig | undefined;
  const inlineExtraRows = inlineMap
    ? Math.max(0, Math.max(2, inlineMap.rows ?? 2) - 1)
    : 0;

  return belowRows + inlineExtraRows;
};
