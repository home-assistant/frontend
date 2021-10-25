import "@polymer/paper-input/paper-input";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-radio";
import "../../../../../components/ha-formfield";
import type { HaRadio } from "../../../../../components/ha-radio";
import type { SunTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import {
  handleChangeEvent,
  TriggerElement,
} from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-sun")
export class HaSunTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: SunTrigger;

  public static get defaultConfig() {
    return {
      event: "sunrise" as SunTrigger["event"],
      offset: 0,
    };
  }

  protected render() {
    const { offset, event } = this.trigger;
    return html`
      <label>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.sun.event"
        )}
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.sun.sunrise"
          )}
        >
          <ha-radio
            name="event"
            value="sunrise"
            .checked=${event === "sunrise"}
            @change=${this._radioGroupPicked}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.sun.sunset"
          )}
        >
          <ha-radio
            name="event"
            value="sunset"
            .checked=${event === "sunset"}
            @change=${this._radioGroupPicked}
          ></ha-radio>
        </ha-formfield>
      </label>

      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.sun.offset"
        )}
        name="offset"
        .value=${offset}
        @value-changed=${this._valueChanged}
      ></paper-input>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
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
    "ha-automation-trigger-sun": HaSunTrigger;
  }
}
