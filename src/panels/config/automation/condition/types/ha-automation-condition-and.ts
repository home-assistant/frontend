import { customElement } from "lit-element";
import { HaLogicalCondition } from "./ha-automation-condition-logical";

@customElement("ha-automation-condition-and")
export class HaAndCondition extends HaLogicalCondition {}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-and": HaAndCondition;
  }
}
