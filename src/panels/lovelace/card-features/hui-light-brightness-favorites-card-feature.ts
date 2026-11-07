import { customElement } from "lit/decorators";
import type { LightEntity } from "../../../data/light";
import {
  DEFAULT_LIGHT_FAVORITE_BRIGHTNESS,
  LIGHT_FAVORITE_BRIGHTNESS_MIN,
  lightBrightnessToPercent,
  lightSupportsBrightness,
} from "../../../data/light";
import { normalizeFavoritePositions } from "../../../data/favorite_positions";
import type { HomeAssistant } from "../../../types";
import {
  HuiNumericFavoriteCardFeatureBase,
  type NumericFavoriteCardFeatureDefinition,
  supportsNumericFavoriteCardFeature,
} from "./hui-numeric-favorite-card-feature-base";
import type {
  LightBrightnessFavoritesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";
import { getMoreInfoHintCardFeatureEditor } from "./get-more-info-hint-card-feature-editor";

const lightBrightnessFavoritesCardFeatureDefinition: NumericFavoriteCardFeatureDefinition<LightEntity> =
  {
    domain: "light",
    supportsPosition: lightSupportsBrightness,
    getFavoritePositions: (entry) => entry?.options?.light?.favorite_brightness,
    getCurrentValue: (stateObj) =>
      lightBrightnessToPercent(stateObj.attributes.brightness),
    normalizeFavoritePositions: (positions) =>
      normalizeFavoritePositions(positions, {
        min: LIGHT_FAVORITE_BRIGHTNESS_MIN,
      }),
    defaultFavoritePositions: DEFAULT_LIGHT_FAVORITE_BRIGHTNESS,
    setPositionService: "turn_on",
    serviceDataKey: "brightness_pct",
    setPositionLabelKey:
      "ui.dialogs.more_info_control.light.favorite_brightness.set",
    featureLabelKey:
      "ui.panel.lovelace.editor.features.types.light-brightness-favorites.label",
  };

export const supportsLightBrightnessFavoritesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) =>
  supportsNumericFavoriteCardFeature(
    hass,
    context,
    lightBrightnessFavoritesCardFeatureDefinition
  );

@customElement("hui-light-brightness-favorites-card-feature")
class HuiLightBrightnessFavoritesCardFeature extends HuiNumericFavoriteCardFeatureBase<
  LightEntity,
  LightBrightnessFavoritesCardFeatureConfig
> {
  protected get _definition(): NumericFavoriteCardFeatureDefinition<LightEntity> {
    return lightBrightnessFavoritesCardFeatureDefinition;
  }

  static getStubConfig(): LightBrightnessFavoritesCardFeatureConfig {
    return {
      type: "light-brightness-favorites",
    };
  }

  public static getConfigElement = getMoreInfoHintCardFeatureEditor;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-brightness-favorites-card-feature": HuiLightBrightnessFavoritesCardFeature;
  }
}
