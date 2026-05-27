import { computeDomain } from "../../../common/entity/compute_domain";
import type { HomeAssistant } from "../../../types";
import {
  SUPPORTS_FEATURE_TYPES,
  type UiFeatureType,
} from "../card-features/registry";
import type { LovelaceCardFeatureConfig } from "../card-features/types";
import type { TileCardConfig } from "../cards/types";
import type { CardSuggestion, CardSuggestionProvider } from "./types";

type TileVariant = UiFeatureType[];

const TILE_VARIANT: TileVariant = [];
const TILE_TOGGLE_VARIANT: TileVariant = ["toggle"];

const SELECT_VARIANTS: TileVariant[] = [TILE_VARIANT, ["select-options"]];

const NUMERIC_INPUT_VARIANTS: TileVariant[] = [TILE_VARIANT, ["numeric-input"]];

const DATE_VARIANTS: TileVariant[] = [TILE_VARIANT, ["date-set"]];

const BUTTON_VARIANTS: TileVariant[] = [TILE_VARIANT, ["button"]];

const DOMAIN_VARIANTS: Record<string, TileVariant[]> = {
  light: [
    TILE_VARIANT,
    ["light-brightness"],
    TILE_TOGGLE_VARIANT,
    ["light-color-temp"],
    ["light-color-favorites"],
  ],
  cover: [
    TILE_VARIANT,
    ["cover-open-close"],
    ["cover-position"],
    ["cover-tilt"],
    ["cover-tilt-position"],
  ],
  climate: [
    TILE_VARIANT,
    ["climate-hvac-modes"],
    ["climate-preset-modes"],
    ["climate-fan-modes"],
    ["climate-swing-modes"],
    ["climate-swing-horizontal-modes"],
    ["target-temperature"],
  ],
  media_player: [
    TILE_VARIANT,
    ["media-player-playback"],
    ["media-player-volume-slider"],
    ["media-player-volume-buttons"],
    ["media-player-source"],
    ["media-player-sound-mode"],
  ],
  fan: [
    TILE_VARIANT,
    ["fan-speed"],
    ["fan-preset-modes"],
    ["fan-direction"],
    ["fan-oscillate"],
  ],
  switch: [TILE_VARIANT, TILE_TOGGLE_VARIANT],
  input_boolean: [TILE_VARIANT, TILE_TOGGLE_VARIANT],
  lock: [TILE_VARIANT, ["lock-commands"], ["lock-open-door"]],
  humidifier: [
    TILE_VARIANT,
    ["humidifier-toggle"],
    ["humidifier-modes"],
    ["target-humidity"],
  ],
  vacuum: [TILE_VARIANT, ["vacuum-commands"]],
  lawn_mower: [TILE_VARIANT, ["lawn-mower-commands"]],
  valve: [TILE_VARIANT, ["valve-open-close"], ["valve-position"]],
  alarm_control_panel: [TILE_VARIANT, ["alarm-modes"]],
  counter: [TILE_VARIANT, ["counter-actions"]],
  input_select: SELECT_VARIANTS,
  select: SELECT_VARIANTS,
  input_number: NUMERIC_INPUT_VARIANTS,
  number: NUMERIC_INPUT_VARIANTS,
  input_datetime: DATE_VARIANTS,
  date: DATE_VARIANTS,
  update: [TILE_VARIANT, ["update-actions"]],
  water_heater: [
    TILE_VARIANT,
    ["water-heater-operation-modes"],
    ["target-temperature"],
  ],
  datetime: DATE_VARIANTS,
  button: BUTTON_VARIANTS,
  input_button: BUTTON_VARIANTS,
  scene: BUTTON_VARIANTS,
  script: BUTTON_VARIANTS,
  weather: [TILE_VARIANT, ["temperature-forecast"], ["precipitation-forecast"]],
};

const DEFAULT_VARIANT: TileVariant = TILE_VARIANT;

const SENSOR_TREND_DEVICE_CLASSES = new Set<string>([
  "battery",
  "carbon_dioxide",
  "carbon_monoxide",
  "humidity",
  "illuminance",
  "pm1",
  "pm10",
  "pm25",
  "power",
  "pressure",
  "temperature",
  "volatile_organic_compounds",
  "wind_speed",
]);

// Domains with a dedicated card-suggestions provider; skip the tile
// fallback so the dedicated card wins.
const EXCLUDED_DOMAINS = new Set(["calendar", "todo", "camera"]);

const getVariants = (
  states: HomeAssistant["states"],
  entityId: string
): TileVariant[] | undefined => {
  const domain = computeDomain(entityId);
  if (domain === "sensor") {
    const stateObj = states[entityId];
    const deviceClass = stateObj?.attributes.device_class;
    const isPercentage = stateObj?.attributes.unit_of_measurement === "%";
    const variants: TileVariant[] = [TILE_VARIANT];
    if (deviceClass && SENSOR_TREND_DEVICE_CLASSES.has(deviceClass)) {
      variants.push(["trend-graph"]);
    }
    if (isPercentage) {
      variants.push(["bar-gauge"]);
    }
    return variants;
  }
  return DOMAIN_VARIANTS[domain];
};

const buildTileConfig = (
  entityId: string,
  features: UiFeatureType[]
): TileCardConfig => {
  const config: TileCardConfig = { type: "tile", entity: entityId };
  if (features.length) {
    config.features = features.map(
      (type) => ({ type }) as LovelaceCardFeatureConfig
    );
  }
  return config;
};

// A throwing supportsX would invalidate the variant; treat it as unsupported
// rather than tearing down the whole suggestion list.
const allFeaturesSupported = (
  hass: HomeAssistant,
  entityId: string,
  features: UiFeatureType[]
): boolean =>
  features.every((type) => {
    try {
      return SUPPORTS_FEATURE_TYPES[type](hass, { entity_id: entityId });
    } catch {
      return false;
    }
  });

const buildLabel = (
  hass: HomeAssistant,
  features: UiFeatureType[]
): string | undefined => {
  if (!features.length) return undefined;
  return features
    .map((type) =>
      hass.localize(`ui.panel.lovelace.editor.features.types.${type}.label`)
    )
    .join(", ");
};

export const tileCardSuggestions: CardSuggestionProvider<TileCardConfig> = {
  getEntitySuggestion(hass, entityId) {
    if (EXCLUDED_DOMAINS.has(computeDomain(entityId))) return null;
    const variants = getVariants(hass.states, entityId) ?? [DEFAULT_VARIANT];
    const suggestions: CardSuggestion<TileCardConfig>[] = [];
    for (const features of variants) {
      if (!allFeaturesSupported(hass, entityId, features)) continue;
      suggestions.push({
        label: buildLabel(hass, features),
        config: buildTileConfig(entityId, features),
      });
    }
    return suggestions.length ? suggestions : null;
  },
};
