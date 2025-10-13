import {
  mdiHome,
  mdiHomeFloor0,
  mdiHomeFloor1,
  mdiHomeFloor2,
  mdiHomeFloor3,
  mdiHomeFloorNegative1,
} from "@mdi/js";
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import type { FloorRegistryEntry } from "../data/floor_registry";
import "./ha-icon";
import "./ha-svg-icon";

export const floorDefaultIconPath = (
  floor: Pick<FloorRegistryEntry, "level">
) => {
  switch (floor.level) {
    case 0:
      return mdiHomeFloor0;
    case 1:
      return mdiHomeFloor1;
    case 2:
      return mdiHomeFloor2;
    case 3:
      return mdiHomeFloor3;
    case -1:
      return mdiHomeFloorNegative1;
  }
  return mdiHome;
};

export const floorDefaultIcon = (floor: Pick<FloorRegistryEntry, "level">) => {
  switch (floor.level) {
    case 0:
      return "mdi:home-floor-0";
    case 1:
      return "mdi:home-floor-1";
    case 2:
      return "mdi:home-floor-2";
    case 3:
      return "mdi:home-floor-3";
    case -1:
      return "mdi:home-floor-negative-1";
  }
  return "mdi:home";
};

@customElement("ha-floor-icon")
export class HaFloorIcon extends LitElement {
  @property({ attribute: false }) public floor!: Pick<
    FloorRegistryEntry,
    "icon" | "level"
  >;

  @property() public icon?: string;

  protected render() {
    if (this.floor.icon) {
      return html`<ha-icon .icon=${this.floor.icon}></ha-icon>`;
    }
    const defaultPath = floorDefaultIconPath(this.floor);

    return html`<ha-svg-icon .path=${defaultPath}></ha-svg-icon>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-floor-icon": HaFloorIcon;
  }
}
