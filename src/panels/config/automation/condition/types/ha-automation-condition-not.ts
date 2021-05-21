import { customElement } from "lit/decorators";
import { HaLogicalCondition } from "./ha-automation-condition-logical";

@customElement("ha-automation-condition-not")
export class HaNotCondition extends HaLogicalCondition {}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-not": HaNotCondition;
  }
}
