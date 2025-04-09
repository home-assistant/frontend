import type { LogicalCondition } from "../../../../../data/automation";

import { customElement } from "lit/decorators";

import { HaLogicalCondition } from "./ha-automation-condition-logical";

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
