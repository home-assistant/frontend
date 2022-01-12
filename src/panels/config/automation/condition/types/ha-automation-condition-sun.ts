import "@polymer/paper-input/paper-input";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { SunCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import {
  ConditionElement,
  handleChangeEvent,
} from "../ha-automation-condition-row";
import "../../../../../components/ha-radio";
import "../../../../../components/ha-formfield";
import type { HaRadio } from "../../../../../components/ha-radio";

@customElement("ha-automation-condition-sun")
export class HaSunCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: SunCondition;

  public static get defaultConfig() {
    return {};
  }

  protected render() {
    const { after, after_offset, before, before_offset } = this.condition;
    return html`
      <label>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.sun.before"
        )}
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.type.sun.sunrise"
          )}
        >
          <ha-radio
            name="before"
            value="sunrise"
            .checked=${before === "sunrise"}
            @change=${this._radioGroupPicked}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.type.sun.sunset"
          )}
        >
          <ha-radio
            name="before"
            value="sunset"
            .checked=${before === "sunset"}
            @change=${this._radioGroupPicked}
          ></ha-radio>
        </ha-formfield>
      </label>

      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.sun.before_offset"
        )}
        name="before_offset"
        .value=${before_offset}
        @value-changed=${this._valueChanged}
      ></paper-input>

      <label>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.sun.after"
        )}

        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.type.sun.sunrise"
          )}
        >
          <ha-radio
            name="after"
            value="sunrise"
            .checked=${after === "sunrise"}
            @change=${this._radioGroupPicked}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.type.sun.sunset"
          )}
        >
          <ha-radio
            name="after"
            value="sunset"
            .checked=${after === "sunset"}
            @change=${this._radioGroupPicked}
          ></ha-radio>
        </ha-formfield>
      </label>

      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.sun.after_offset"
        )}
        name="after_offset"
        .value=${after_offset}
        @value-changed=${this._valueChanged}
      ></paper-input>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  private _radioGroupPicked(ev: CustomEvent) {
    const key = (ev.target as HaRadio).name;
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.condition,
        [key]: (ev.target as HaRadio).value,
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
    "ha-automation-condition-sun": HaSunCondition;
  }
}
