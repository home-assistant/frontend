import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { HaDurationData } from "../../../components/ha-duration-input";
import type { ActionConfig } from "../../../data/lovelace/config/action";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { Statistic, StatisticType } from "../../../data/recorder";
import type { ForecastType } from "../../../data/weather";
import type {
  FullCalendarView,
  ThemeMode,
  TranslationDict,
} from "../../../types";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeaturePosition,
} from "../card-features/types";
import type { LegacyStateFilter } from "../common/evaluate-filter";
import type { Condition, LegacyCondition } from "../common/validate-condition";
import type { HuiImage } from "../components/hui-image";
import type { TimestampRenderingFormat } from "../components/types";
import type { LovelaceElementConfig } from "../elements/types";
import type {
  EntityConfig,
  EntityFilterEntityConfig,
  LovelaceRowConfig,
} from "../entity-rows/types";
import type { LovelaceHeaderFooterConfig } from "../header-footer/types";
import type { LovelaceHeadingBadgeConfig } from "../heading-badges/types";
import type { TimeFormat } from "../../../data/translation";

export type AlarmPanelCardConfigState =
  | "arm_away"
  | "arm_home"
  | "arm_night"
  | "arm_vacation"
  | "arm_custom_bypass";

export interface AlarmPanelCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  states?: AlarmPanelCardConfigState[];
  theme?: string;
}

export interface CalendarCardConfig extends LovelaceCardConfig {
  entities: string[];
  initial_view?: FullCalendarView;
  title?: string;
  theme?: string;
}

export interface ConditionalCardConfig extends LovelaceCardConfig {
  card: LovelaceCardConfig;
  conditions: (Condition | LegacyCondition)[];
}

export interface EmptyStateCardConfig extends LovelaceCardConfig {
  content: string;
  title?: string;
}

export interface EntityCardConfig extends LovelaceCardConfig {
  attribute?: string;
  unit?: string;
  theme?: string;
  state_color?: boolean;
}

export interface EntitiesCardEntityConfig extends EntityConfig {
  type?: string;
  secondary_info?:
    | "entity-id"
    | "last-changed"
    | "last-triggered"
    | "last-updated"
    | "position"
    | "state"
    | "tilt-position"
    | "brightness";
  action_name?: string;
  action?: string;
  /** @deprecated use "action" instead */
  service?: string;
  // "service_data" is kept for backwards compatibility. Replaced by "data".
  service_data?: Record<string, unknown>;
  data?: Record<string, unknown>;
  url?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  state_color?: boolean;
  show_name?: boolean;
  show_icon?: boolean;
}

export interface EntitiesCardConfig extends LovelaceCardConfig {
  type: "entities";
  show_header_toggle?: boolean;
  title?: string;
  entities: (LovelaceRowConfig | string)[];
  theme?: string;
  icon?: string;
  header?: LovelaceHeaderFooterConfig;
  footer?: LovelaceHeaderFooterConfig;
  state_color?: boolean;
}

export type AreaCardDisplayType = "compact" | "icon" | "picture" | "camera";
export interface AreaCardConfig extends LovelaceCardConfig {
  area?: string;
  name?: string;
  color?: string;
  navigation_path?: string;
  display_type?: AreaCardDisplayType;
  /** @deprecated Use `display_type` instead */
  show_camera?: boolean;
  camera_view?: HuiImage["cameraView"];
  aspect_ratio?: string;
  sensor_classes?: string[];
  alert_classes?: string[];
  features?: LovelaceCardFeatureConfig[];
  features_position?: LovelaceCardFeaturePosition;
  exclude_entities?: string[];
}

export interface ButtonCardConfig extends LovelaceCardConfig {
  entity?: string;
  name?: string;
  show_name?: boolean;
  icon?: string;
  icon_height?: string;
  show_icon?: boolean;
  theme?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  state_color?: boolean;
  show_state?: boolean;
}

export interface EnergyCardBaseConfig extends LovelaceCardConfig {
  collection_key?: string;
}

export interface EnergySummaryCardConfig extends EnergyCardBaseConfig {
  type: "energy-summary";
  title?: string;
}

export interface EnergyDistributionCardConfig extends EnergyCardBaseConfig {
  type: "energy-distribution";
  title?: string;
  link_dashboard?: boolean;
}
export interface EnergyUsageGraphCardConfig extends EnergyCardBaseConfig {
  type: "energy-usage-graph";
  title?: string;
}

export interface EnergySolarGraphCardConfig extends EnergyCardBaseConfig {
  type: "energy-solar-graph";
  title?: string;
}

export interface EnergyGasGraphCardConfig extends EnergyCardBaseConfig {
  type: "energy-gas-graph";
  title?: string;
}

export interface EnergyWaterGraphCardConfig extends EnergyCardBaseConfig {
  type: "energy-water-graph";
  title?: string;
}

export interface EnergyDevicesGraphCardConfig extends EnergyCardBaseConfig {
  type: "energy-devices-graph";
  title?: string;
  max_devices?: number;
}

export interface EnergyDevicesDetailGraphCardConfig
  extends EnergyCardBaseConfig {
  type: "energy-devices-detail-graph";
  title?: string;
  max_devices?: number;
}

export interface EnergySourcesTableCardConfig extends EnergyCardBaseConfig {
  type: "energy-sources-table";
  title?: string;
}

export interface EnergySolarGaugeCardConfig extends EnergyCardBaseConfig {
  type: "energy-solar-consumed-gauge";
  title?: string;
}

export interface EnergySelfSufficiencyGaugeCardConfig
  extends EnergyCardBaseConfig {
  type: "energy-self-sufficiency-gauge";
  title?: string;
}

export interface EnergyGridNeutralityGaugeCardConfig
  extends EnergyCardBaseConfig {
  type: "energy-grid-neutrality-gauge";
  title?: string;
}

export interface EnergyCarbonGaugeCardConfig extends EnergyCardBaseConfig {
  type: "energy-carbon-consumed-gauge";
  title?: string;
}

export interface EnergySankeyCardConfig extends EnergyCardBaseConfig {
  type: "energy-sankey";
  title?: string;
  layout?: "vertical" | "horizontal" | "auto";
  group_by_floor?: boolean;
  group_by_area?: boolean;
}

export interface EntityFilterCardConfig extends LovelaceCardConfig {
  type: "entity-filter";
  entities: (EntityFilterEntityConfig | string)[];
  state_filter?: LegacyStateFilter[];
  conditions: Condition[];
  card?: Partial<LovelaceCardConfig>;
  show_empty?: boolean;
}

export interface ErrorCardConfig extends LovelaceCardConfig {
  error?: string;
  message?: string;
  origConfig?: LovelaceCardConfig;
  severity?: "warning" | "error";
}

export interface SeverityConfig {
  green?: number;
  yellow?: number;
  red?: number;
}

export interface GaugeSegment {
  from: number;
  color: string;
  label?: string;
}

export interface GaugeCardConfig extends LovelaceCardConfig {
  entity: string;
  attribute?: string;
  name?: string;
  unit?: string;
  min?: number;
  max?: number;
  severity?: SeverityConfig;
  theme?: string;
  needle?: boolean;
  segments?: GaugeSegment[];
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface ConfigEntity extends EntityConfig {
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface PictureGlanceEntityConfig extends ConfigEntity {
  show_state?: boolean;
  attribute?: string;
  prefix?: string;
  suffix?: string;
}

export interface GlanceConfigEntity extends ConfigEntity {
  show_last_changed?: boolean;
  image?: string;
  show_state?: boolean;
  state_color?: boolean;
  format: TimestampRenderingFormat;
}

export interface GlanceCardConfig extends LovelaceCardConfig {
  show_name?: boolean;
  show_state?: boolean;
  show_icon?: boolean;
  title?: string;
  theme?: string;
  entities: (string | GlanceConfigEntity)[];
  columns?: number;
  state_color?: boolean;
}

export interface HumidifierCardConfig extends LovelaceCardConfig {
  entity: string;
  theme?: string;
  name?: string;
  show_current_as_primary?: boolean;
  features?: LovelaceCardFeatureConfig[];
}

export interface IframeCardConfig extends LovelaceCardConfig {
  allow_open_top_navigation?: boolean;
  aspect_ratio?: string;
  disable_sandbox?: boolean;
  title?: string;
  allow?: string;
  url: string;
}

export interface LightCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  theme?: string;
  icon?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface LogbookCardConfig extends LovelaceCardConfig {
  type: "logbook";
  /**
   * @deprecated Use target instead
   */
  entities?: string[];
  target: HassServiceTarget;
  title?: string;
  hours_to_show?: number;
  theme?: string;
}

interface GeoLocationSourceConfig {
  source: string;
  label_mode?: "name" | "state" | "attribute" | "icon";
  attribute?: string;
  unit?: string;
  focus?: boolean;
}

export interface MapCardConfig extends LovelaceCardConfig {
  type: "map";
  title?: string;
  aspect_ratio?: string;
  auto_fit?: boolean;
  fit_zones?: boolean;
  default_zoom?: number;
  entities?: (EntityConfig | string)[];
  hours_to_show?: number;
  geo_location_sources?: (GeoLocationSourceConfig | string)[];
  dark_mode?: boolean;
  theme_mode?: ThemeMode;
  cluster?: boolean;
}

export interface MarkdownCardConfig extends LovelaceCardConfig {
  type: "markdown";
  content: string;
  text_only?: boolean;
  title?: string;
  card_size?: number;
  entity_ids?: string | string[];
  theme?: string;
  show_empty?: boolean;
}

export interface ClockCardConfig extends LovelaceCardConfig {
  type: "clock";
  title?: string;
  clock_size?: "small" | "medium" | "large";
  show_seconds?: boolean | undefined;
  time_format?: TimeFormat;
  time_zone?: string;
  no_background?: boolean;
}

export interface MediaControlCardConfig extends LovelaceCardConfig {
  entity: string;
  theme?: string;
}

export interface HistoryGraphCardConfig extends LovelaceCardConfig {
  entities: (EntityConfig | string)[];
  hours_to_show?: number;
  title?: string;
  show_names?: boolean;
  logarithmic_scale?: boolean;
  min_y_axis?: number;
  max_y_axis?: number;
  fit_y_data?: boolean;
  split_device_classes?: boolean;
  expand_legend?: boolean;
}

export interface StatisticsGraphCardConfig extends EnergyCardBaseConfig {
  title?: string;
  entities: (EntityConfig | string)[];
  unit?: string;
  days_to_show?: number;
  period?: "5minute" | "hour" | "day" | "month";
  stat_types?: StatisticType | StatisticType[];
  chart_type?: "line" | "bar";
  min_y_axis?: number;
  max_y_axis?: number;
  fit_y_data?: boolean;
  hide_legend?: boolean;
  logarithmic_scale?: boolean;
  energy_date_selection?: boolean;
  expand_legend?: boolean;
}

export interface StatisticCardConfig extends LovelaceCardConfig {
  name?: string;
  entities: (EntityConfig | string)[];
  period:
    | {
        fixed_period?: { start: string; end: string };
        calendar?: { period: string; offset: number };
        rolling_window?: { duration: HaDurationData; offset: HaDurationData };
      }
    | "energy_date_selection";
  stat_type: keyof Statistic;
  theme?: string;
}

export interface PictureCardConfig extends LovelaceCardConfig {
  image?: string;
  image_entity?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  theme?: string;
  alt_text?: string;
}

export interface PictureElementsCardConfig extends LovelaceCardConfig {
  title?: string;
  image?: string;
  image_entity?: string;
  camera_image?: string;
  camera_view?: HuiImage["cameraView"];
  state_image?: Record<string, unknown>;
  state_filter?: string[];
  aspect_ratio?: string;
  entity?: string;
  elements: LovelaceElementConfig[];
  theme?: string;
  dark_mode_image?: string;
  dark_mode_filter?: string;
}

export interface PictureEntityCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  image?: string;
  camera_image?: string;
  camera_view?: HuiImage["cameraView"];
  state_image?: Record<string, unknown>;
  state_filter?: string[];
  aspect_ratio?: string;
  fit_mode?: "cover" | "contain" | "fill";
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  show_name?: boolean;
  show_state?: boolean;
  theme?: string;
}

export interface PictureGlanceCardConfig extends LovelaceCardConfig {
  entities: (string | PictureGlanceEntityConfig)[];
  title?: string;
  image?: string;
  image_entity?: string;
  camera_image?: string;
  camera_view?: HuiImage["cameraView"];
  state_image?: Record<string, unknown>;
  state_filter?: string[];
  aspect_ratio?: string;
  fit_mode?: "cover" | "contain" | "fill";
  entity?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  show_state?: boolean;
  theme?: string;
}

export interface PlantAttributeTarget extends EventTarget {
  value?: string;
}

export interface PlantStatusCardConfig extends LovelaceCardConfig {
  name?: string;
  entity: string;
  theme?: string;
}

export interface SensorCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  graph?: string;
  unit?: string;
  detail?: number;
  theme?: string;
  hours_to_show?: number;
  limits?: {
    min?: number;
    max?: number;
  };
}

export interface TodoListCardConfig extends LovelaceCardConfig {
  title?: string;
  theme?: string;
  entity?: string;
  hide_completed?: boolean;
  hide_create?: boolean;
  sort?: string;
}

export interface StackCardConfig extends LovelaceCardConfig {
  cards: LovelaceCardConfig[];
  title?: string;
}

export interface GridCardConfig extends StackCardConfig {
  columns?: number;
  square?: boolean;
}

export interface ThermostatCardConfig extends LovelaceCardConfig {
  entity: string;
  theme?: string;
  name?: string;
  show_current_as_primary?: boolean;
  features?: LovelaceCardFeatureConfig[];
}

export interface WeatherForecastCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  show_current?: boolean;
  show_forecast?: boolean;
  forecast_type?: ForecastType;
  forecast_slots?: number;
  secondary_info_attribute?: keyof TranslationDict["ui"]["card"]["weather"]["attributes"];
  theme?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface TileCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  hide_state?: boolean;
  state_content?: string | string[];
  icon?: string;
  color?: string;
  show_entity_picture?: boolean;
  vertical?: boolean;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  icon_tap_action?: ActionConfig;
  icon_hold_action?: ActionConfig;
  icon_double_tap_action?: ActionConfig;
  features?: LovelaceCardFeatureConfig[];
  features_position?: LovelaceCardFeaturePosition;
}

export interface HeadingCardConfig extends LovelaceCardConfig {
  heading_style?: "title" | "subtitle";
  heading?: string;
  icon?: string;
  tap_action?: ActionConfig;
  badges?: LovelaceHeadingBadgeConfig[];
  /** @deprecated Use `badges` instead */
  entities?: LovelaceHeadingBadgeConfig[];
}
