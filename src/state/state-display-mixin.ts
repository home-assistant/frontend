import { computeFormatState } from "../common/translations/state";
import { Constructor, HomeAssistant } from "../types";
import { HassBaseEl } from "./hass-base-mixin";

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected hassConnected() {
      super.hassConnected();
      this._updateStateDisplay();
    }

    protected updated(changedProps) {
      super.updated(changedProps);
      if (!changedProps.has("hass")) {
        return;
      }
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

      if (this.hass) {
        if (
          this.hass.localize !== oldHass?.localize ||
          this.hass.locale !== oldHass.locale ||
          this.hass.config !== oldHass.config
        ) {
          this._updateStateDisplay();
        }
      }
    }

    private _updateStateDisplay = async () => {
      if (!this.hass) return;
      this._updateHass({
        stateDisplay: await computeFormatState(
          this.hass.localize,
          this.hass.locale,
          this.hass.config
        ),
      });
    };
  };
