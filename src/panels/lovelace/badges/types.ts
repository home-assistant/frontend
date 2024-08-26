import type { ActionConfig } from "../../../data/lovelace/config/action";
import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import type { LegacyStateFilter } from "../common/evaluate-filter";
import type { Condition } from "../common/validate-condition";
import type { EntityFilterEntityConfig } from "../entity-rows/types";
import type { DisplayType } from "./hui-entity-badge";

export interface EntityFilterBadgeConfig extends LovelaceBadgeConfig {
  type: "entity-filter";
  entities: Array<EntityFilterEntityConfig | string>;
  state_filter?: Array<LegacyStateFilter>;
  conditions?: Array<Condition>;
}

export interface ErrorBadgeConfig extends LovelaceBadgeConfig {
  error: string;
  origConfig: LovelaceBadgeConfig;
}

export interface StateLabelBadgeConfig extends LovelaceBadgeConfig {
  entity: string;
  name?: string;
  icon?: string;
  image?: string;
  show_name?: boolean;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface EntityBadgeConfig extends LovelaceBadgeConfig {
  type: "entity";
  entity?: string;
  name?: string;
  icon?: string;
  color?: string;
  show_name?: boolean;
  show_state?: boolean;
  show_icon?: boolean;
  show_entity_picture?: boolean;
  state_content?: string | string[];
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  /**
   * @deprecated use `show_state`, `show_name`, `icon_type`
   */
  display_type?: DisplayType;
}
