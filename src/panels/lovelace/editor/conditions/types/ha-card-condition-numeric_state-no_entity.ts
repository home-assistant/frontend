import { customElement } from "lit/decorators";
import type { NumericStateCondition } from "../../../common/validate-condition";
import { HaCardConditionNumericState } from "./ha-card-condition-numeric_state";

@customElement("ha-card-condition-numeric_state-no_entity")
export class HaCardConditionNumericStateNoEntity extends HaCardConditionNumericState {
  public static get defaultConfig(): NumericStateCondition {
    return { condition: "numeric_state" };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-numeric_state-no_entity": HaCardConditionNumericStateNoEntity;
  }
}
