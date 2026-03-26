import { customElement, property } from "lit/decorators";
import { HaSelectorState } from "./ha-selector-state";

@customElement("ha-selector-state_no_entity")
export class HaSelectorStateNoEntity extends HaSelectorState {
  @property({ type: Boolean }) public no_entity = true;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-state_no_entity": HaSelectorStateNoEntity;
  }
}
