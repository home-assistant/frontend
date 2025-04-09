import type { InputSelectEntity } from "../../../data/input_select";
import type { HomeAssistant } from "../../../types";
import type { EntitiesCardEntityConfig } from "../cards/types";
import type { LovelaceRow } from "./types";
import type { PropertyValues } from "lit";

import "../../../components/ha-select";
import "../components/hui-generic-entity-row";
import "@material/mwc-list/mwc-list-item";

import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";

import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { UNAVAILABLE } from "../../../data/entity";
import { forwardHaptic } from "../../../data/haptics";
import { setInputSelectOption } from "../../../data/input_select";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";

@customElement("hui-input-select-entity-row")
class HuiInputSelectEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntitiesCardEntityConfig;

  public setConfig(config: EntitiesCardEntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Entity must be specified");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity] as
      | InputSelectEntity
      | undefined;

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
        hide-name
      >
        <ha-select
          .label=${this._config.name || computeStateName(stateObj)}
          .value=${stateObj.state}
          .options=${stateObj.attributes.options}
          .disabled=${
            stateObj.state === UNAVAILABLE /* UNKNOWN state is allowed */
          }
          naturalMenuWidth
          @selected=${this._selectedChanged}
          @click=${stopPropagation}
          @closed=${stopPropagation}
        >
          ${stateObj.attributes.options
            ? stateObj.attributes.options.map(
                (option) =>
                  html`<mwc-list-item .value=${option}
                    >${option}</mwc-list-item
                  >`
              )
            : ""}
        </ha-select>
      </hui-generic-entity-row>
    `;
  }

  static styles = css`
    hui-generic-entity-row {
      display: flex;
      align-items: center;
    }
    ha-select {
      width: 100%;
      --ha-select-min-width: 0;
    }
  `;

  private _selectedChanged(ev): void {
    const stateObj = this.hass!.states[
      this._config!.entity
    ] as InputSelectEntity;
    const option = ev.target.value;
    if (
      option === stateObj.state ||
      !stateObj.attributes.options.includes(option)
    ) {
      return;
    }

    forwardHaptic("light");

    setInputSelectOption(this.hass!, stateObj.entity_id, option);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-select-entity-row": HuiInputSelectEntityRow;
  }
}
