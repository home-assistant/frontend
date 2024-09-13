import { HaDurationData } from "../../../components/ha-duration-input";
import { ActionConfig } from "../../../data/lovelace/config/action";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { Statistic, StatisticType } from "../../../data/recorder";
import { ForecastType } from "../../../data/weather";
import { FullCalendarView, ThemeMode, TranslationDict } from "../../../types";
import { LovelaceCardFeatureConfig } from "../card-features/types";
import { LegacyStateFilter } from "../common/evaluate-filter";
import { Condition, LegacyCondition } from "../common/validate-condition";
import { HuiImage } from "../components/hui-image";
import { TimestampRenderingFormat } from "../components/types";
import { LovelaceElementConfig } from "../elements/types";
import {
  EntityConfig,
  EntityFilterEntityConfig,
  LovelaceRowConfig,
} from "../entity-rows/types";
import { LovelaceHeaderFooterConfig } from "../header-footer/types";

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
  entities: Array<LovelaceRowConfig | string>;
  theme?: string;
  icon?: string;
  header?: LovelaceHeaderFooterConfig;
  footer?: LovelaceHeaderFooterConfig;
  state_color?: boolean;
}

export interface AreaCardConfig extends LovelaceCardConfig {
  area: string;
  navigation_path?: string;
  show_camera?: boolean;
  camera_view?: HuiImage["cameraView"];
  aspect_ratio?: string;
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

export interface EntityFilterCardConfig extends LovelaceCardConfig {
  type: "entity-filter";
  entities: Array<EntityFilterEntityConfig | string>;
  state_filter?: Array<LegacyStateFilter>;
  conditions: Array<Condition>;
  card?: Partial<LovelaceCardConfig>;
  show_empty?: boolean;
}

export interface ErrorCardConfig extends LovelaceCardConfig {
  error: string;
  origConfig: LovelaceCardConfig;
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
  entities: string[];
  title?: string;
  hours_to_show?: number;
  theme?: string;
}

export interface MapCardConfig extends LovelaceCardConfig {
  type: "map";
  title?: string;
  aspect_ratio?: string;
  auto_fit?: boolean;
  fit_zones?: boolean;
  default_zoom?: number;
  entities?: Array<EntityConfig | string>;
  hours_to_show?: number;
  geo_location_sources?: string[];
  dark_mode?: boolean;
  theme_mode?: ThemeMode;
}

export interface MarkdownCardConfig extends LovelaceCardConfig {
  type: "markdown";
  content: string;
  title?: string;
  card_size?: number;
  entity_ids?: string | string[];
  theme?: string;
  show_empty?: boolean;
}

export interface MediaControlCardConfig extends LovelaceCardConfig {
  entity: string;
  theme?: string;
}

export interface HistoryGraphCardConfig extends LovelaceCardConfig {
  entities: Array<EntityConfig | string>;
  hours_to_show?: number;
  title?: string;
  show_names?: boolean;
  logarithmic_scale?: boolean;
  min_y_axis?: number;
  max_y_axis?: number;
  fit_y_data?: boolean;
  split_device_classes?: boolean;
}

export interface StatisticsGraphCardConfig extends LovelaceCardConfig {
  title?: string;
  entities: Array<EntityConfig | string>;
  unit?: string;
  days_to_show?: number;
  period?: "5minute" | "hour" | "day" | "month";
  stat_types?: StatisticType | StatisticType[];
  chart_type?: "line" | "bar";
  hide_legend?: boolean;
  logarithmic_scale?: boolean;
}

export interface StatisticCardConfig extends LovelaceCardConfig {
  name?: string;
  entities: Array<EntityConfig | string>;
  period: {
    fixed_period?: { start: string; end: string };
    calendar?: { period: string; offset: number };
    rolling_window?: { duration: HaDurationData; offset: HaDurationData };
  };
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
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  show_name?: boolean;
  show_state?: boolean;
  theme?: string;
}

export interface PictureGlanceCardConfig extends LovelaceCardConfig {
  entities: Array<string | PictureGlanceEntityConfig>;
  title?: string;
  image?: string;
  image_entity?: string;
  camera_image?: string;
  camera_view?: HuiImage["cameraView"];
  state_image?: Record<string, unknown>;
  state_filter?: string[];
  aspect_ratio?: string;
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
}
