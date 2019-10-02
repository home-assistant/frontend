import { LovelaceBadgeConfig } from "../../../data/lovelace";
import { EntityFilterEntityConfig } from "../entity-rows/types";

export interface StateLabelBadgeConfig extends LovelaceBadgeConfig {
  entity: string;
  name?: string;
  states?: string[];
}

export interface EntityFilterBadgeConfig extends LovelaceBadgeConfig {
  type: "entity-filter";
  entities: Array<EntityFilterEntityConfig | string>;
  state_filter: Array<{ key: string } | string>;
}

export interface ErrorBadgeConfig extends LovelaceBadgeConfig {
  error: string;
  origConfig: LovelaceBadgeConfig;
}
