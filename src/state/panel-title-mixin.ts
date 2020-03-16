import { getPanelTitle } from "../data/panel";
import { HassBaseEl } from "./hass-base-mixin";
import { HomeAssistant, Constructor } from "../types";

export const panelTitleMixin = <T extends Constructor<HassBaseEl>>(
  superClass: T
) =>
  class extends superClass {
    private _oldHass?: HomeAssistant;

    protected updated(changedProps) {
      super.updated(changedProps);
      if (!changedProps.has("hass") || !this.hass) {
        return;
      }
      if (!this._oldHass) {
        this.setTitle(getPanelTitle(this.hass));
      }
      this._oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!this._oldHass || this._oldHass.panelUrl !== this.hass.panelUrl) {
        this.setTitle(getPanelTitle(this.hass));
      }
    }

    private setTitle(title: string | undefined) {
      document.title = title
        ? `${title} - ${this.hass!.localize("domain.homeassistant")}`
        : this.hass!.localize("domain.homeassistant");
    }
  };
