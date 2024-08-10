import { customElement } from "lit/decorators";
import { HaLogicalCondition } from "./ha-automation-condition-logical";
import { LogicalCondition } from "../../../../../data/automation";

@customElement("ha-automation-condition-not")
export class HaNotCondition extends HaLogicalCondition {
  public static get defaultConfig(): LogicalCondition {
    return {
      condition: "not",
      conditions: [],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-not": HaNotCondition;
  }
}
