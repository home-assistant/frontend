import { ActionConfig } from "../../../data/lovelace/config/action";
import { Condition } from "../common/validate-condition";

export type LovelaceHeadingBadgeConfig = {
  type?: string;
  [key: string]: any;
  visibility?: Condition[];
};

export interface ErrorBadgeConfig extends LovelaceHeadingBadgeConfig {
  type: string;
  error: string;
  origConfig: LovelaceHeadingBadgeConfig;
}

export interface EntityHeadingBadgeConfig extends LovelaceHeadingBadgeConfig {
  type?: "entity";
  entity: string;
  name?: string;
  state_content?: string | string[];
  icon?: string;
  show_state?: boolean;
  show_icon?: boolean;
  color?: string;
  tap_action?: ActionConfig;
}
