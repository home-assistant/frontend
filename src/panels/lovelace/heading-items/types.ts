import { ActionConfig } from "../../../data/lovelace/config/action";
import { Condition } from "../common/validate-condition";

export type LovelaceHeadingItemConfig = EntityHeadingItemConfig;

export interface HeadingItemBase {
  type?: string;
  [key: string]: any;
  visibility?: Condition[];
}

export interface EntityHeadingItemConfig extends HeadingItemBase {
  type?: "entity";
  entity: string;
  state_content?: string | string[];
  icon?: string;
  show_state?: boolean;
  show_icon?: boolean;
  color?: string;
  tap_action?: ActionConfig;
}
