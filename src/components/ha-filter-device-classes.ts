import { customElement } from "lit/decorators";
import { HaFilterStates } from "./ha-filter-states";

@customElement("ha-filter-device-classes")
export class HaFilterDeviceClasses extends HaFilterStates {}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-device-classes": HaFilterDeviceClasses;
  }
}
