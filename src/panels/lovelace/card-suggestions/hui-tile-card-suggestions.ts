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
  label: string;
  features: UiFeatureType[];
}

const TILE_LABEL = "Tile";
const TILE_TOGGLE_LABEL = "Tile with toggle";

const SELECT_VARIANTS: TileVariant[] = [
  { id: "tile", label: TILE_LABEL, features: [] },
  {
    id: "tile-options",
    label: "Tile with options",
    features: ["select-options"],
  },
];

const NUMERIC_INPUT_VARIANTS: TileVariant[] = [
  { id: "tile", label: TILE_LABEL, features: [] },
  {
    id: "tile-input",
    label: "Tile with numeric input",
    features: ["numeric-input"],
  },
];

const DATE_VARIANTS: TileVariant[] = [
  { id: "tile", label: TILE_LABEL, features: [] },
  { id: "tile-date", label: "Tile with date picker", features: ["date-set"] },
];

const DOMAIN_VARIANTS: Record<string, TileVariant[]> = {
  light: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-brightness",
      label: "Tile with brightness",
      features: ["light-brightness"],
    },
    { id: "tile-toggle", label: TILE_TOGGLE_LABEL, features: ["toggle"] },
    {
      id: "tile-color-temp",
      label: "Tile with color temperature",
      features: ["light-color-temp"],
    },
    {
      id: "tile-color-favorites",
      label: "Tile with favorite colors",
      features: ["light-color-favorites"],
    },
  ],
  cover: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-open-close",
      label: "Tile with open/close",
      features: ["cover-open-close"],
    },
    {
      id: "tile-position",
      label: "Tile with position",
      features: ["cover-position"],
    },
    {
      id: "tile-tilt",
      label: "Tile with tilt",
      features: ["cover-tilt"],
    },
  ],
  climate: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-hvac-modes",
      label: "Tile with HVAC modes",
      features: ["climate-hvac-modes"],
    },
  ],
  media_player: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-playback",
      label: "Tile with playback controls",
      features: ["media-player-playback"],
    },
    {
      id: "tile-volume-slider",
      label: "Tile with volume slider",
      features: ["media-player-volume-slider"],
    },
  ],
  fan: [
    { id: "tile", label: TILE_LABEL, features: [] },
    { id: "tile-speed", label: "Tile with speed", features: ["fan-speed"] },
    {
      id: "tile-preset-modes",
      label: "Tile with preset modes",
      features: ["fan-preset-modes"],
    },
  ],
  switch: [
    { id: "tile", label: TILE_LABEL, features: [] },
    { id: "tile-toggle", label: TILE_TOGGLE_LABEL, features: ["toggle"] },
  ],
  input_boolean: [
    { id: "tile", label: TILE_LABEL, features: [] },
    { id: "tile-toggle", label: TILE_TOGGLE_LABEL, features: ["toggle"] },
  ],
  lock: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-commands",
      label: "Tile with lock commands",
      features: ["lock-commands"],
    },
  ],
  humidifier: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-toggle",
      label: "Tile with humidifier toggle",
      features: ["humidifier-toggle"],
    },
    {
      id: "tile-modes",
      label: "Tile with humidifier modes",
      features: ["humidifier-modes"],
    },
  ],
  vacuum: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-commands",
      label: "Tile with vacuum commands",
      features: ["vacuum-commands"],
    },
  ],
  lawn_mower: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-commands",
      label: "Tile with mower commands",
      features: ["lawn-mower-commands"],
    },
  ],
  valve: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-open-close",
      label: "Tile with open/close",
      features: ["valve-open-close"],
    },
    {
      id: "tile-position",
      label: "Tile with position",
      features: ["valve-position"],
    },
  ],
  alarm_control_panel: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-modes",
      label: "Tile with alarm modes",
      features: ["alarm-modes"],
    },
  ],
  counter: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-actions",
      label: "Tile with counter actions",
      features: ["counter-actions"],
    },
  ],
  input_select: SELECT_VARIANTS,
  select: SELECT_VARIANTS,
  input_number: NUMERIC_INPUT_VARIANTS,
  number: NUMERIC_INPUT_VARIANTS,
  input_datetime: DATE_VARIANTS,
  date: DATE_VARIANTS,
  update: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-actions",
      label: "Tile with update actions",
      features: ["update-actions"],
    },
  ],
  water_heater: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-operation-modes",
      label: "Tile with operation modes",
      features: ["water-heater-operation-modes"],
    },
  ],
  weather: [
    { id: "tile", label: TILE_LABEL, features: [] },
    {
      id: "tile-hourly-forecast",
      label: "Tile with hourly forecast",
      features: ["hourly-forecast"],
    },
  ],
};

const DEFAULT_VARIANT: TileVariant = {
  id: "tile",
  label: TILE_LABEL,
  features: [],
};

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
  { id: "tile", label: TILE_LABEL, features: [] },
  {
    id: "tile-trend-graph",
    label: "Tile with trend graph",
    features: ["trend-graph"],
  },
];

const EXCLUDED_DOMAINS = ["calendar", "todo"];

const getVariants = (
  hass: HomeAssistant,
  entityId: string
): TileVariant[] | undefined => {
  const domain = computeDomain(entityId);
  if (EXCLUDED_DOMAINS.includes(domain)) return undefined;
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

const allFeaturesSupported = (
  hass: HomeAssistant,
  entityId: string,
  features: UiFeatureType[]
): boolean =>
  features.every((type) => {
    const supports = SUPPORTS_FEATURE_TYPES[type];
    if (!supports) {
      return false;
    }
    try {
      return supports(hass, { entity_id: entityId });
    } catch {
      return false;
    }
  });

export const pickBestTileFeatures = (
  hass: HomeAssistant,
  entityId: string
): UiFeatureType[] => {
  const variants = getVariants(hass, entityId);
  if (!variants) return [];
  for (const variant of variants) {
    if (
      variant.features.length &&
      allFeaturesSupported(hass, entityId, variant.features)
    ) {
      return variant.features;
    }
  }
  return [];
};

export const tileCardSuggestions: CardSuggestionProvider<TileCardConfig> = {
  getEntitySuggestion(hass, entityId) {
    if (EXCLUDED_DOMAINS.includes(computeDomain(entityId))) return null;
    const variants = getVariants(hass, entityId) ?? [DEFAULT_VARIANT];
    const suggestions: CardSuggestion<TileCardConfig>[] = [];
    for (const variant of variants) {
      if (!allFeaturesSupported(hass, entityId, variant.features)) continue;
      suggestions.push({
        id: variant.id,
        label: variant.label,
        config: buildTileConfig(entityId, variant.features),
      });
    }
    return suggestions.length ? suggestions : null;
  },
};
