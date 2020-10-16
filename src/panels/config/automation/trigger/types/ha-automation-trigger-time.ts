import "@polymer/paper-input/paper-input";
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from "lit-element";
import "../../../../../components/entity/ha-entity-picker";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-radio";
import { TimeTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  handleChange,
  handleChangeEvent,
  TriggerElement,
} from "../ha-automation-trigger-row";

const includeDomains = ["input_datetime"];

@customElement("ha-automation-trigger-time")
export class HaTimeTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: TimeTrigger;

  @internalProperty() private _inputMode?: boolean;

  public static get defaultConfig() {
    return { at: [""] };
  }

  protected render() {
    const { at } = this.trigger;
    // Since we ensured in HaAutomationEditor::updated() that each trigger can only
    // have either literal or entity time triggers, it's sufficient to check the first element.
    const inputMode = this._inputMode ?? at[0]?.startsWith("input_datetime.");
    return html`
      <ha-formfield
        .label=${this.hass!.localize(
          "ui.panel.config.automation.editor.triggers.type.time.type_value"
        )}
      >
        <ha-radio
          @change=${this._handleModeChanged}
          name="mode"
          value="value"
          ?checked=${!inputMode}
        ></ha-radio>
      </ha-formfield>
      <ha-formfield
        .label=${this.hass!.localize(
          "ui.panel.config.automation.editor.triggers.type.time.type_input"
        )}
      >
        <ha-radio
          @change=${this._handleModeChanged}
          name="mode"
          value="input"
          ?checked=${inputMode}
        ></ha-radio>
      </ha-formfield>
      ${inputMode
        ? at.map(
            (value, idx) => html` <ha-entity-picker
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.triggers.type.time.at"
              )}
              .includeDomains=${includeDomains}
              .name=${"at-" + idx}
              .value=${value?.startsWith("input_datetime.") ? value : ""}
              @value-changed=${this._valueChanged}
              .hass=${this.hass}
            ></ha-entity-picker>`
          )
        : at.map(
            (value, idx) => html` <paper-input
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.triggers.type.time.at"
              )}
              name=${"at-" + idx}
              .value=${value?.startsWith("input_datetime.") ? "" : value}
              @value-changed=${this._valueChanged}
            ></paper-input>`
          )}
    `;
  }

  private _handleModeChanged(ev: Event) {
    this._inputMode = (ev.target as any).value === "input";
  }

  private _valueChanged(ev: CustomEvent): void {
    const name = (ev.target as any)?.name;

    if (name.startsWith("at-")) {
      ev.stopPropagation();
      const value = ev.detail.value;
      const idx = name.split("-").pop();

      if ((this.trigger.at[idx] || "") === value) {
        return;
      }

      this.trigger.at[idx] = value;
      handleChange(this, "at", this.trigger.at);
    } else {
      handleChangeEvent(this, ev);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-time": HaTimeTrigger;
  }
}
