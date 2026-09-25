import type { HomeAssistant } from "../../../../types";
import type { Condition } from "../../common/validate-condition";

export interface LovelaceConditionEditorConstructor {
  defaultConfig?: Condition;
  validateUIConfig?: (condition: Condition, hass: HomeAssistant) => void;
}
