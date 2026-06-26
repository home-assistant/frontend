import { customElement } from "lit/decorators";
import type { StateCondition } from "../../../common/validate-condition";
import { HaCardConditionState } from "./ha-card-condition-state";

@customElement("ha-card-condition-state-no_entity")
export class HaCardConditionStateNoEntity extends HaCardConditionState {
  public static get defaultConfig(): StateCondition {
    return {
      condition: "state",
      state: "",
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-state-no_entity": HaCardConditionStateNoEntity;
  }
}
