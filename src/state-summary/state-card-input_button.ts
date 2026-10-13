import { customElement } from "lit/decorators";
import { StateCardButton } from "./state-card-button";

@customElement("state-card-input_button")
class StateCardInputButton extends StateCardButton {}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-input_button": StateCardInputButton;
  }
}
