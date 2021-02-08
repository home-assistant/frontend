import { ActionConfig, LovelaceCardConfig } from "../../../data/lovelace";
import { FullCalendarView } from "../../../types";
import { Condition } from "../common/validate-condition";
import { HuiImage } from "../components/hui-image";
import { LovelaceElementConfig } from "../elements/types";
import {
  EntityConfig,
  EntityFilterEntityConfig,
  LovelaceRowConfig,
} from "../entity-rows/types";
import { LovelaceHeaderFooterConfig } from "../header-footer/types";

export interface AlarmPanelCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  states?: string[];
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
  conditions: Condition[];
}

export interface EmptyStateCardConfig extends LovelaceCardConfig {
  content: string;
  title?: string;
}

export interface EntityCardConfig extends LovelaceCardConfig {
  attribute?: string;
  unit?: string;
  theme?: string;
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
  service?: string;
  service_data?: Record<string, unknown>;
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

export interface ButtonCardConfig extends LovelaceCardConfig {
  entity?: string;
  name?: string;
  show_name?: boolean;
  icon?: string;
  show_icon?: boolean;
  theme?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  state_color?: boolean;
  show_state?: boolean;
}

export interface EntityFilterCardConfig extends LovelaceCardConfig {
  type: "entity-filter";
  entities: Array<EntityFilterEntityConfig | string>;
  state_filter: Array<{ key: string } | string>;
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

export interface GaugeCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  unit?: string;
  min?: number;
  max?: number;
  severity?: SeverityConfig;
  theme?: string;
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
}

export interface GlanceCardConfig extends LovelaceCardConfig {
  show_name?: boolean;
  show_state?: boolean;
  show_icon?: boolean;
  title?: string;
  theme?: string;
  entities: Array<string | ConfigEntity>;
  columns?: number;
  state_color?: boolean;
}

export interface HumidifierCardConfig extends LovelaceCardConfig {
  entity: string;
  theme?: string;
  name?: string;
}

export interface IframeCardConfig extends LovelaceCardConfig {
  aspect_ratio?: string;
  title?: string;
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
  default_zoom?: number;
  entities?: Array<EntityConfig | string>;
  hours_to_show?: number;
  geo_location_sources?: string[];
  dark_mode?: boolean;
}

export interface MarkdownCardConfig extends LovelaceCardConfig {
  type: "markdown";
  content: string;
  title?: string;
  card_size?: number;
  entity_ids?: string | string[];
  theme?: string;
}

export interface MediaControlCardConfig extends LovelaceCardConfig {
  entity: string;
  theme?: string;
}

export interface HistoryGraphCardConfig extends LovelaceCardConfig {
  entities: Array<EntityConfig | string>;
  hours_to_show?: number;
  refresh_interval?: number;
  title?: string;
}

export interface PictureCardConfig extends LovelaceCardConfig {
  image?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  theme?: string;
}

export interface PictureElementsCardConfig extends LovelaceCardConfig {
  title?: string;
  image?: string;
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
}

export interface ShoppingListCardConfig extends LovelaceCardConfig {
  title?: string;
  theme?: string;
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
}

export interface WeatherForecastCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  show_forecast?: boolean;
  secondary_info_attribute?: string;
  theme?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}
