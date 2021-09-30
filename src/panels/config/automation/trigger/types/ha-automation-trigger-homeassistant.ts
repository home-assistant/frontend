import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import type { PaperRadioGroupElement } from "@polymer/paper-radio-group/paper-radio-group";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { HassTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-trigger-homeassistant")
export default class HaHassTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: HassTrigger;

  public static get defaultConfig() {
    return {
      event: "start",
    };
  }

  protected render() {
    const { event } = this.trigger;
    return html`
      <label id="eventlabel">
        ${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.homeassistant.event"
        )}
      </label>
      <paper-radio-group
        .selected=${event}
        aria-labelledby="eventlabel"
        @paper-radio-group-changed=${this._radioGroupPicked}
      >
        <paper-radio-button name="start">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.homeassistant.start"
          )}
        </paper-radio-button>
        <paper-radio-button name="shutdown">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.homeassistant.shutdown"
          )}
        </paper-radio-button>
      </paper-radio-group>
    `;
  }

  private _radioGroupPicked(ev) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.trigger,
        event: (ev.target as PaperRadioGroupElement).selected,
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-homeassistant": HaHassTrigger;
  }
}
