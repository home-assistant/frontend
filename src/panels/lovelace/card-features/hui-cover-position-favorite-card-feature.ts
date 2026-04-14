import { customElement } from "lit/decorators";
import type { CoverEntity } from "../../../data/cover";
import {
  DEFAULT_COVER_FAVORITE_POSITIONS,
  coverSupportsPosition,
  normalizeCoverFavoritePositions,
} from "../../../data/cover";
import type { HomeAssistant } from "../../../types";
import {
  HuiNumericFavoriteCardFeatureBase,
  type NumericFavoriteCardFeatureDefinition,
  supportsNumericFavoriteCardFeature,
} from "./hui-numeric-favorite-card-feature-base";
import type {
  CoverPositionFavoriteCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";
import { getMoreInfoHintCardFeatureEditor } from "./get-more-info-hint-card-feature-editor";

const coverPositionFavoriteCardFeatureDefinition: NumericFavoriteCardFeatureDefinition<CoverEntity> =
  {
    domain: "cover",
    supportsPosition: coverSupportsPosition,
    getFavoritePositions: (entry) => entry?.options?.cover?.favorite_positions,
    getCurrentValue: (stateObj) => stateObj.attributes.current_position,
    normalizeFavoritePositions: normalizeCoverFavoritePositions,
    defaultFavoritePositions: DEFAULT_COVER_FAVORITE_POSITIONS,
    setPositionService: "set_cover_position",
    serviceDataKey: "position",
    setPositionLabelKey:
      "ui.dialogs.more_info_control.cover.favorite_position.set",
    featureLabelKey:
      "ui.panel.lovelace.editor.features.types.cover-position-favorite.label",
  };

export const supportsCoverPositionFavoriteCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) =>
  supportsNumericFavoriteCardFeature(
    hass,
    context,
    coverPositionFavoriteCardFeatureDefinition
  );

@customElement("hui-cover-position-favorite-card-feature")
class HuiCoverPositionFavoriteCardFeature extends HuiNumericFavoriteCardFeatureBase<
  CoverEntity,
  CoverPositionFavoriteCardFeatureConfig
> {
  protected get _definition(): NumericFavoriteCardFeatureDefinition<CoverEntity> {
    return coverPositionFavoriteCardFeatureDefinition;
  }

  static getStubConfig(): CoverPositionFavoriteCardFeatureConfig {
    return {
      type: "cover-position-favorite",
    };
  }

  public static getConfigElement = getMoreInfoHintCardFeatureEditor;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-position-favorite-card-feature": HuiCoverPositionFavoriteCardFeature;
  }
}
