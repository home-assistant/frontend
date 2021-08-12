import { html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/entity/ha-entity-picker";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-radio";
import { TimeTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  handleChangeEvent,
  TriggerElement,
} from "../ha-automation-trigger-row";
import "../../../../../components/ha-time-input";
import { fireEvent } from "../../../../../common/dom/fire_event";

const includeDomains = ["input_datetime"];
@customElement("ha-automation-trigger-time")
export class HaTimeTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: TimeTrigger;

  @state() private _inputMode?: boolean;

  public static get defaultConfig() {
    return { at: "" };
  }

  public willUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("trigger")) {
      return;
    }
    // We dont support multiple times atm.
    if (this.trigger && Array.isArray(this.trigger.at)) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(this.hass.localize("ui.errors.config.editor_not_supported"))
      );
    }
  }

  protected render() {
    const at = this.trigger.at;

    if (Array.isArray(at)) {
      return html``;
    }

    const inputMode =
      this._inputMode ??
      (at?.startsWith("input_datetime.") || at?.startsWith("sensor."));

    return html`<ha-formfield
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
        ? html`<ha-entity-picker
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.type.time.at"
            )}
            .includeDomains=${includeDomains}
            .name=${"at"}
            .value=${at?.startsWith("input_datetime.") ||
            at?.startsWith("sensor.")
              ? at
              : ""}
            @value-changed=${this._valueChanged}
            .hass=${this.hass}
            allow-custom-entity
          ></ha-entity-picker>`
        : html`<ha-time-input
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.type.time.at"
            )}
            .name=${"at"}
            .value=${at?.startsWith("input_datetime.") ||
            at?.startsWith("sensor.")
              ? ""
              : at}
            .locale=${this.hass.locale}
            @value-changed=${this._valueChanged}
          ></ha-time-input>`} `;
  }

  private _handleModeChanged(ev: Event) {
    this._inputMode = (ev.target as any).value === "input";
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-time": HaTimeTrigger;
  }
}
