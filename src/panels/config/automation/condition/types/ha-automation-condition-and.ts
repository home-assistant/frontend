import { customElement } from "lit/decorators";
import { HaLogicalCondition } from "./ha-automation-condition-logical";
import { LogicalCondition } from "../../../../../data/automation";

@customElement("ha-automation-condition-and")
export class HaAndCondition extends HaLogicalCondition {
  public static get defaultConfig(): LogicalCondition {
    return {
      condition: "and",
      conditions: [],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-and": HaAndCondition;
  }
}
