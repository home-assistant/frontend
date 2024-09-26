import { ActionConfig } from "../../../data/lovelace/config/action";
import { Condition } from "../common/validate-condition";

export type LovelaceHeadingItemConfig = {
  type?: string;
  [key: string]: any;
  visibility?: Condition[];
};

export interface EntityHeadingItemConfig extends LovelaceHeadingItemConfig {
  type?: "entity";
  entity: string;
  state_content?: string | string[];
  icon?: string;
  show_state?: boolean;
  show_icon?: boolean;
  color?: string;
  tap_action?: ActionConfig;
}
