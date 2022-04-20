import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { UNAVAILABLE, UNAVAILABLE_STATES } from "../../../data/entity";
import { setValue } from "../../../data/input_text";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { EntityConfig, LovelaceRow } from "./types";
import "../../../components/ha-textfield";
import { computeStateName } from "../../../common/entity/compute_state_name";

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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        hideName
      >
        <ha-textfield
          .label=${this._config.name || computeStateName(stateObj)}
          .disabled=${stateObj.state === UNAVAILABLE}
          .value=${stateObj.state}
          .minlength=${stateObj.attributes.min}
          .maxlength=${stateObj.attributes.max}
          .autoValidate=${stateObj.attributes.pattern}
          .pattern=${stateObj.attributes.pattern}
          .type=${stateObj.attributes.mode}
          @change=${this._selectedValueChanged}
          placeholder="(empty value)"
        ></ha-textfield>
      </hui-generic-entity-row>
    `;
  }

  private _selectedValueChanged(ev): void {
    const stateObj = this.hass!.states[this._config!.entity];

    const newValue = ev.target.value;

    // Filter out invalid text states
    if (newValue && UNAVAILABLE_STATES.includes(newValue)) {
      ev.target.value = stateObj.state;
      return;
    }

    if (newValue !== stateObj.state) {
      setValue(this.hass!, stateObj.entity_id, newValue);
    }

    ev.target.blur();
  }

  static styles = css`
    hui-generic-entity-row {
      display: flex;
      align-items: center;
    }
    ha-textfield {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-text-entity-row": HuiInputTextEntityRow;
  }
}
