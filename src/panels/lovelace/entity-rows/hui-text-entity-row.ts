import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-textfield";
import { isUnavailableState, UNAVAILABLE } from "../../../data/entity";
import type { TextEntity } from "../../../data/text";
import { setValue } from "../../../data/text";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-text-entity-row")
class HuiTextEntityRow extends LitElement implements LovelaceRow {
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

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity] as
      | TextEntity
      | undefined;

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        hide-name
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
          @change=${this._valueChanged}
          placeholder=${this.hass!.localize("ui.card.text.emtpy_value")}
        ></ha-textfield>
      </hui-generic-entity-row>
    `;
  }

  private _valueChanged(ev): void {
    const stateObj = this.hass!.states[this._config!.entity] as TextEntity;
    const newValue = ev.target.value;

    // Filter out invalid text states
    if (newValue && isUnavailableState(newValue)) {
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
    "hui-text-entity-row": HuiTextEntityRow;
  }
}
