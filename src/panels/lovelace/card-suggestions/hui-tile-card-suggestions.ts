import { computeDomain } from "../../../common/entity/compute_domain";
import type { HomeAssistant } from "../../../types";
import {
  SUPPORTS_FEATURE_TYPES,
  type UiFeatureType,
} from "../card-features/registry";
import type { LovelaceCardFeatureConfig } from "../card-features/types";
import type { TileCardConfig } from "../cards/types";
import type { CardSuggestion, CardSuggestionProvider } from "./types";

interface TileVariant {
  id: string;
  features: UiFeatureType[];
}

const LABEL_PREFIX = "ui.panel.lovelace.editor.cardpicker.suggestions.";

const TILE_VARIANT: TileVariant = { id: "tile", features: [] };
const TILE_TOGGLE_VARIANT: TileVariant = {
  id: "tile_toggle",
  features: ["toggle"],
};

const SELECT_VARIANTS: TileVariant[] = [
  TILE_VARIANT,
  { id: "tile_options", features: ["select-options"] },
];

const NUMERIC_INPUT_VARIANTS: TileVariant[] = [
  TILE_VARIANT,
  { id: "tile_numeric_input", features: ["numeric-input"] },
];

const DATE_VARIANTS: TileVariant[] = [
  TILE_VARIANT,
  { id: "tile_date_picker", features: ["date-set"] },
];

const DOMAIN_VARIANTS: Record<string, TileVariant[]> = {
  light: [
    TILE_VARIANT,
    { id: "tile_brightness", features: ["light-brightness"] },
    TILE_TOGGLE_VARIANT,
    { id: "tile_color_temperature", features: ["light-color-temp"] },
    { id: "tile_favorite_colors", features: ["light-color-favorites"] },
  ],
  cover: [
    TILE_VARIANT,
    { id: "tile_open_close", features: ["cover-open-close"] },
    { id: "tile_position", features: ["cover-position"] },
    { id: "tile_tilt", features: ["cover-tilt"] },
  ],
  climate: [
    TILE_VARIANT,
    { id: "tile_hvac_modes", features: ["climate-hvac-modes"] },
  ],
  media_player: [
    TILE_VARIANT,
    { id: "tile_playback_controls", features: ["media-player-playback"] },
    { id: "tile_volume_slider", features: ["media-player-volume-slider"] },
  ],
  fan: [
    TILE_VARIANT,
    { id: "tile_speed", features: ["fan-speed"] },
    { id: "tile_preset_modes", features: ["fan-preset-modes"] },
  ],
  switch: [TILE_VARIANT, TILE_TOGGLE_VARIANT],
  input_boolean: [TILE_VARIANT, TILE_TOGGLE_VARIANT],
  lock: [
    TILE_VARIANT,
    { id: "tile_lock_commands", features: ["lock-commands"] },
  ],
  humidifier: [
    TILE_VARIANT,
    { id: "tile_humidifier_toggle", features: ["humidifier-toggle"] },
    { id: "tile_humidifier_modes", features: ["humidifier-modes"] },
  ],
  vacuum: [
    TILE_VARIANT,
    { id: "tile_vacuum_commands", features: ["vacuum-commands"] },
  ],
  lawn_mower: [
    TILE_VARIANT,
    { id: "tile_mower_commands", features: ["lawn-mower-commands"] },
  ],
  valve: [
    TILE_VARIANT,
    { id: "tile_open_close", features: ["valve-open-close"] },
    { id: "tile_position", features: ["valve-position"] },
  ],
  alarm_control_panel: [
    TILE_VARIANT,
    { id: "tile_alarm_modes", features: ["alarm-modes"] },
  ],
  counter: [
    TILE_VARIANT,
    { id: "tile_counter_actions", features: ["counter-actions"] },
  ],
  input_select: SELECT_VARIANTS,
  select: SELECT_VARIANTS,
  input_number: NUMERIC_INPUT_VARIANTS,
  number: NUMERIC_INPUT_VARIANTS,
  input_datetime: DATE_VARIANTS,
  date: DATE_VARIANTS,
  update: [
    TILE_VARIANT,
    { id: "tile_update_actions", features: ["update-actions"] },
  ],
  water_heater: [
    TILE_VARIANT,
    { id: "tile_operation_modes", features: ["water-heater-operation-modes"] },
  ],
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

const SENSOR_TREND_VARIANTS: TileVariant[] = [
  TILE_VARIANT,
  { id: "tile_trend_graph", features: ["trend-graph"] },
];

// Domains with a dedicated card-suggestions provider — skip tile suggestions
// for them so the dedicated card wins.
const EXCLUDED_DOMAINS = new Set(["calendar", "todo"]);

const getVariants = (
  hass: HomeAssistant,
  entityId: string
): TileVariant[] | undefined => {
  const domain = computeDomain(entityId);
  if (domain === "sensor") {
    const deviceClass = hass.states[entityId]?.attributes.device_class;
    if (deviceClass && SENSOR_TREND_DEVICE_CLASSES.has(deviceClass)) {
      return SENSOR_TREND_VARIANTS;
    }
    return undefined;
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

// A throwing supportsX would invalidate the variant — treat it as unsupported
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

export const tileCardSuggestions: CardSuggestionProvider<TileCardConfig> = {
  getEntitySuggestion(hass, entityId) {
    if (EXCLUDED_DOMAINS.has(computeDomain(entityId))) return null;
    const variants = getVariants(hass, entityId) ?? [DEFAULT_VARIANT];
    const suggestions: CardSuggestion<TileCardConfig>[] = [];
    for (const variant of variants) {
      if (!allFeaturesSupported(hass, entityId, variant.features)) continue;
      suggestions.push({
        id: variant.id,
        label: hass.localize(`${LABEL_PREFIX}${variant.id}`),
        config: buildTileConfig(entityId, variant.features),
      });
    }
    return suggestions.length ? suggestions : null;
  },
};
