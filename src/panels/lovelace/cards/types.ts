import { LovelaceCardConfig, ActionConfig } from "../../../data/lovelace";
import { Condition } from "../common/validate-condition";
import { EntityConfig } from "../entity-rows/types";
import { LovelaceElementConfig } from "../elements/types";
import { HuiImage } from "../components/hui-image";

export interface AlarmPanelCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  states?: string[];
}

export interface ConditionalCardConfig extends LovelaceCardConfig {
  card: LovelaceCardConfig;
  conditions: Condition[];
}

export interface EmptyStateCardConfig extends LovelaceCardConfig {
  content: string;
  title?: string;
}

export interface EntitiesCardEntityConfig extends EntityConfig {
  type?: string;
  secondary_info?: "entity-id" | "last-changed";
  action_name?: string;
  service?: string;
  service_data?: object;
  url?: string;
}

export interface EntitiesCardConfig extends LovelaceCardConfig {
  type: "entities";
  show_header_toggle?: boolean;
  title?: string;
  entities: EntitiesCardEntityConfig[];
  theme?: string;
}

export interface EntityButtonCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  show_name?: boolean;
  icon?: string;
  show_icon?: boolean;
  theme?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

export interface EntityFilterCardConfig extends LovelaceCardConfig {
  type: "entity-filter";
  entities: Array<EntityConfig | string>;
  state_filter: string[];
  card: Partial<LovelaceCardConfig>;
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
}

export interface GlanceCardConfig extends LovelaceCardConfig {
  show_name?: boolean;
  show_state?: boolean;
  show_icon?: boolean;
  title?: string;
  theme?: string;
  entities: ConfigEntity[];
  columns?: number;
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
}

export interface MapCardConfig extends LovelaceCardConfig {
  type: "map";
  title: string;
  aspect_ratio: string;
  default_zoom?: number;
  entities?: Array<EntityConfig | string>;
  geo_location_sources?: string[];
  dark_mode?: boolean;
}

export interface MarkdownCardConfig extends LovelaceCardConfig {
  type: "markdown";
  content: string;
  title?: string;
}

export interface MediaControlCardConfig extends LovelaceCardConfig {
  entity: string;
}

export interface PictureCardConfig extends LovelaceCardConfig {
  image?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

export interface PictureElementsCardConfig extends LovelaceCardConfig {
  title?: string;
  image?: string;
  camera_image?: string;
  camera_view?: HuiImage["cameraView"];
  state_image?: {};
  aspect_ratio?: string;
  entity?: string;
  elements: LovelaceElementConfig[];
}

export interface PictureEntityCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  image?: string;
  camera_image?: string;
  camera_view?: HuiImage["cameraView"];
  state_image?: {};
  aspect_ratio?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  show_name?: boolean;
  show_state?: boolean;
}

export interface PictureGlanceCardConfig extends LovelaceCardConfig {
  entities: EntityConfig[];
  title?: string;
  image?: string;
  camera_image?: string;
  camera_view?: HuiImage["cameraView"];
  state_image?: {};
  aspect_ratio?: string;
  entity?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

export interface PlantAttributeTarget extends EventTarget {
  value?: string;
}

export interface PlantStatusCardConfig extends LovelaceCardConfig {
  name?: string;
  entity: string;
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
}

export interface StackCardConfig extends LovelaceCardConfig {
  cards: LovelaceCardConfig[];
}

export interface ThermostatCardConfig extends LovelaceCardConfig {
  entity: string;
  theme?: string;
  name?: string;
}

export interface WeatherForecastCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
}
