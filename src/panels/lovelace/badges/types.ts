import type { ActionConfig } from "../../../data/lovelace/config/action";
import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import type { LegacyStateFilter } from "../common/evaluate-filter";
import type { Condition } from "../common/validate-condition";
import type { EntityFilterEntityConfig } from "../entity-rows/types";

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
  display_type?: "minimal" | "standard" | "complete";
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}
