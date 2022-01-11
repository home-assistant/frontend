import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { HaRadio } from "../../../../../components/ha-radio";
import type { HassTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-radio";

@customElement("ha-automation-trigger-homeassistant")
export class HaHassTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: HassTrigger;

  public static get defaultConfig() {
    return {
      event: "start" as HassTrigger["event"],
    };
  }

  protected render() {
    const { event } = this.trigger;
    return html`
      <label id="eventlabel">
        ${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.homeassistant.event"
        )}
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.homeassistant.start"
          )}
        >
          <ha-radio
            name="event"
            value="start"
            .checked=${event === "start"}
            @change=${this._radioGroupPicked}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.homeassistant.shutdown"
          )}
        >
          <ha-radio
            name="event"
            value="shutdown"
            .checked=${event === "shutdown"}
            @change=${this._radioGroupPicked}
          ></ha-radio>
        </ha-formfield>
      </label>
    `;
  }

  private _radioGroupPicked(ev) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.trigger,
        event: (ev.target as HaRadio).value,
      },
    });
  }

  static styles = css`
    label {
      display: flex;
      align-items: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-homeassistant": HaHassTrigger;
  }
}
