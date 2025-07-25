import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-list-item";
import "../../../components/ha-select";
import { UNAVAILABLE } from "../../../data/entity";
import { forwardHaptic } from "../../../data/haptics";
import type { SelectEntity } from "../../../data/select";
import { setSelectOption } from "../../../data/select";
import type { HomeAssistant } from "../../../types";
import type { EntitiesCardEntityConfig } from "../cards/types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceRow } from "./types";

@customElement("hui-select-entity-row")
class HuiSelectEntityRow extends LitElement implements LovelaceRow {
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
      | SelectEntity
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
        <ha-select
          .label=${this._config.name || computeStateName(stateObj)}
          .value=${stateObj.state}
          .options=${stateObj.attributes.options}
          .disabled=${stateObj.state === UNAVAILABLE}
          naturalMenuWidth
          @action=${this._handleAction}
          @click=${stopPropagation}
          @closed=${stopPropagation}
        >
          ${stateObj.attributes.options
            ? stateObj.attributes.options.map(
                (option) => html`
                  <ha-list-item .value=${option}>
                    ${this.hass!.formatEntityState(stateObj, option)}
                  </ha-list-item>
                `
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

  private _handleAction(ev): void {
    const stateObj = this.hass!.states[this._config!.entity] as SelectEntity;

    const option = ev.target.value;

    if (
      option === stateObj.state ||
      !stateObj.attributes.options.includes(option)
    ) {
      return;
    }

    forwardHaptic("light");

    setSelectOption(this.hass!, stateObj.entity_id, option);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-select-entity-row": HuiSelectEntityRow;
  }
}
