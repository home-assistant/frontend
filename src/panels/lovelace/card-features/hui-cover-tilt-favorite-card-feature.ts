import { customElement } from "lit/decorators";
import type { CoverEntity } from "../../../data/cover";
import {
  DEFAULT_COVER_FAVORITE_POSITIONS,
  coverSupportsTiltPosition,
  normalizeCoverFavoritePositions,
} from "../../../data/cover";
import type { HomeAssistant } from "../../../types";
import {
  HuiNumericFavoriteCardFeatureBase,
  type NumericFavoriteCardFeatureDefinition,
  supportsNumericFavoriteCardFeature,
} from "./hui-numeric-favorite-card-feature-base";
import type {
  CoverTiltFavoriteCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";
import { getMoreInfoHintCardFeatureEditor } from "./get-more-info-hint-card-feature-editor";

const coverTiltFavoriteCardFeatureDefinition: NumericFavoriteCardFeatureDefinition<CoverEntity> =
  {
    domain: "cover",
    supportsPosition: coverSupportsTiltPosition,
    getFavoritePositions: (entry) =>
      entry?.options?.cover?.favorite_tilt_positions,
    getCurrentValue: (stateObj) => stateObj.attributes.current_tilt_position,
    normalizeFavoritePositions: normalizeCoverFavoritePositions,
    defaultFavoritePositions: DEFAULT_COVER_FAVORITE_POSITIONS,
    setPositionService: "set_cover_tilt_position",
    serviceDataKey: "tilt_position",
    setPositionLabelKey:
      "ui.dialogs.more_info_control.cover.favorite_tilt_position.set",
    featureLabelKey:
      "ui.panel.lovelace.editor.features.types.cover-tilt-favorite.label",
  };

export const supportsCoverTiltFavoriteCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) =>
  supportsNumericFavoriteCardFeature(
    hass,
    context,
    coverTiltFavoriteCardFeatureDefinition
  );

@customElement("hui-cover-tilt-favorite-card-feature")
class HuiCoverTiltFavoriteCardFeature extends HuiNumericFavoriteCardFeatureBase<
  CoverEntity,
  CoverTiltFavoriteCardFeatureConfig
> {
  protected get _definition(): NumericFavoriteCardFeatureDefinition<CoverEntity> {
    return coverTiltFavoriteCardFeatureDefinition;
  }

  static getStubConfig(): CoverTiltFavoriteCardFeatureConfig {
    return {
      type: "cover-tilt-favorite",
    };
  }

  public static getConfigElement = getMoreInfoHintCardFeatureEditor;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-tilt-favorite-card-feature": HuiCoverTiltFavoriteCardFeature;
  }
}
