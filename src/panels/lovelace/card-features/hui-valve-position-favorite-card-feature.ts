import { customElement } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import type { ValveEntity } from "../../../data/valve";
import {
  DEFAULT_VALVE_FAVORITE_POSITIONS,
  valveSupportsPosition,
} from "../../../data/valve";
import { normalizeFavoritePositions } from "../../../data/favorite_positions";
import {
  HuiNumericFavoriteCardFeatureBase,
  type NumericFavoriteCardFeatureDefinition,
  supportsNumericFavoriteCardFeature,
} from "./hui-numeric-favorite-card-feature-base";
import type {
  LovelaceCardFeatureContext,
  ValvePositionFavoriteCardFeatureConfig,
} from "./types";
import { getMoreInfoHintCardFeatureEditor } from "./get-more-info-hint-card-feature-editor";

const valvePositionFavoriteCardFeatureDefinition: NumericFavoriteCardFeatureDefinition<ValveEntity> =
  {
    domain: "valve",
    supportsPosition: valveSupportsPosition,
    getFavoritePositions: (entry) => entry?.options?.valve?.favorite_positions,
    getCurrentValue: (stateObj) => stateObj.attributes.current_position,
    normalizeFavoritePositions,
    defaultFavoritePositions: DEFAULT_VALVE_FAVORITE_POSITIONS,
    setPositionService: "set_valve_position",
    serviceDataKey: "position",
    setPositionLabelKey:
      "ui.dialogs.more_info_control.valve.favorite_position.set",
    featureLabelKey:
      "ui.panel.lovelace.editor.features.types.valve-position-favorite.label",
  };

export const supportsValvePositionFavoriteCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) =>
  supportsNumericFavoriteCardFeature(
    hass,
    context,
    valvePositionFavoriteCardFeatureDefinition
  );

@customElement("hui-valve-position-favorite-card-feature")
class HuiValvePositionFavoriteCardFeature extends HuiNumericFavoriteCardFeatureBase<
  ValveEntity,
  ValvePositionFavoriteCardFeatureConfig
> {
  protected get _definition(): NumericFavoriteCardFeatureDefinition<ValveEntity> {
    return valvePositionFavoriteCardFeatureDefinition;
  }

  static getStubConfig(): ValvePositionFavoriteCardFeatureConfig {
    return {
      type: "valve-position-favorite",
    };
  }

  public static getConfigElement = getMoreInfoHintCardFeatureEditor;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-valve-position-favorite-card-feature": HuiValvePositionFavoriteCardFeature;
  }
}
