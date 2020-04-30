import { customElement } from "lit-element";
import { HaLogicalCondition } from "./ha-automation-condition-logical";

@customElement("ha-automation-condition-or")
export class HaOrCondition extends HaLogicalCondition {}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-or": HaOrCondition;
  }
}
