import { ActionConfig, LovelaceBadgeConfig } from "../../../data/lovelace";
import { EntityFilterEntityConfig } from "../entity-rows/types";

export interface EntityFilterBadgeConfig extends LovelaceBadgeConfig {
  type: "entity-filter";
  entities: Array<EntityFilterEntityConfig | string>;
  state_filter: Array<{ key: string } | string>;
}

export interface ErrorBadgeConfig extends LovelaceBadgeConfig {
  error: string;
}

export interface StateLabelBadgeConfig extends LovelaceBadgeConfig {
  entity: string;
  name?: string;
  icon?: string;
  image?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}
