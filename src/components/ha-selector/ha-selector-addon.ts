import { customElement } from "lit/decorators";
import { HaAppSelector } from "./ha-selector-app";

@customElement("ha-selector-addon")
export class HaAddonSelector extends HaAppSelector {}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-addon": HaAddonSelector;
  }
}
