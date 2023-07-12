import { computeFormatFunctions } from "../common/translations/state";
import { Constructor, HomeAssistant } from "../types";
import { HassBaseEl } from "./hass-base-mixin";

export default <T extends Constructor<HassBaseEl>>(superClass: T) => {
  class StateDisplayMixin extends superClass {
    protected hassConnected() {
      super.hassConnected();
      this._updateStateDisplay();
    }

    protected willUpdate(changedProps) {
      super.willUpdate(changedProps);

      if (!changedProps.has("hass")) {
        return;
      }
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

      if (this.hass) {
        if (
          this.hass.localize !== oldHass?.localize ||
          this.hass.locale !== oldHass.locale ||
          this.hass.config !== oldHass.config ||
          this.hass.entities !== oldHass.entities
        ) {
          this._updateStateDisplay();
        }
      }
    }

    private _updateStateDisplay = async () => {
      if (!this.hass) return;
      const { formatState, formatAttributeName, formatAttributeValue } =
        await computeFormatFunctions(
          this.hass.localize,
          this.hass.locale,
          this.hass.config,
          this.hass.entities
        );
      this._updateHass({
        formatState,
        formatAttributeName,
        formatAttributeValue,
      });
    };
  }
  return StateDisplayMixin;
};
