import type { LogicalCondition } from "../../../../../data/automation";

import { customElement } from "lit/decorators";

import { HaLogicalCondition } from "./ha-automation-condition-logical";

@customElement("ha-automation-condition-or")
export class HaOrCondition extends HaLogicalCondition {
  public static get defaultConfig(): LogicalCondition {
    return {
      condition: "or",
      conditions: [],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-or": HaOrCondition;
  }
}
