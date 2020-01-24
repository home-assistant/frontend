import { LovelaceCardConfig } from "../../../data/lovelace";
import { Condition } from "../common/validate-condition";
import { LovelaceElementConfig } from "../elements/types";

export interface ConditionalBaseConfig extends LovelaceCardConfig {
  card: LovelaceCardConfig | LovelaceElementConfig;
  conditions: Condition[];
}
