import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeaturePosition,
} from "../types";

export interface CardFeatureLayout {
  inline: LovelaceCardFeatureConfig[];
  stacked: LovelaceCardFeatureConfig[];
  /** Columns filled by the stacked features, 0 when there are none */
  columns: number;
}

const INLINE_COLUMNS = 2;

export const computeCardFeatureLayout = (
  features: LovelaceCardFeatureConfig[] | undefined,
  position: LovelaceCardFeaturePosition
): CardFeatureLayout => {
  if (position !== "inline") {
    return { inline: [], stacked: features ?? [], columns: 1 };
  }
  const inline = features?.slice(0, 1) ?? [];
  const stacked = features?.slice(1) ?? [];
  return { inline, stacked, columns: Math.min(stacked.length, INLINE_COLUMNS) };
};

export const computeCardFeatureRows = (
  features: LovelaceCardFeatureConfig[] | undefined,
  position: LovelaceCardFeaturePosition
): number => {
  const { stacked, columns } = computeCardFeatureLayout(features, position);
  return Math.ceil(stacked.length / Math.max(columns, 1));
};
