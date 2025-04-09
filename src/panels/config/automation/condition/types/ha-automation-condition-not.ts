import type { LogicalCondition } from "../../../../../data/automation";

import { customElement } from "lit/decorators";

import { HaLogicalCondition } from "./ha-automation-condition-logical";

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
