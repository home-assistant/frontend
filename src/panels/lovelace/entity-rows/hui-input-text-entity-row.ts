import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/input/ha-input";
import type { HaInput } from "../../../components/input/ha-input";
import { isUnavailableState, UNAVAILABLE } from "../../../data/entity/entity";
import { setValue } from "../../../data/input_text";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-input-text-entity-row")
class HuiInputTextEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const name = this.hass!.formatEntityName(stateObj, this._config.name);

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        hide-name
      >
        <ha-input
          .label=${name}
          .disabled=${stateObj.state === UNAVAILABLE}
          .value=${stateObj.state}
          .minlength=${stateObj.attributes.min}
          .maxlength=${stateObj.attributes.max}
          .autoValidate=${stateObj.attributes.pattern}
          .pattern=${stateObj.attributes.pattern}
          .type=${stateObj.attributes.mode}
          @change=${this._selectedValueChanged}
          .placeholder=${this.hass.localize("ui.card.text.empty_value")}
        ></ha-input>
      </hui-generic-entity-row>
    `;
  }

  private _selectedValueChanged(ev: InputEvent): void {
    const stateObj = this.hass!.states[this._config!.entity];
    const target = ev.target as HaInput;

    const newValue = target.value ?? "";

    // Filter out invalid text states
    if (newValue && isUnavailableState(newValue)) {
      target.value = stateObj.state;
      return;
    }

    if (newValue !== stateObj.state) {
      setValue(this.hass!, stateObj.entity_id, newValue);
    }

    target.blur();
  }

  static styles = css`
    hui-generic-entity-row {
      display: flex;
      align-items: center;
    }
    ha-input {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-text-entity-row": HuiInputTextEntityRow;
  }
}
