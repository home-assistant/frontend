import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeaturePosition,
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
  const { below, columns } = computeCardFeatureLayout(features, position);
  return Math.ceil(below.length / Math.max(columns, 1));
};
