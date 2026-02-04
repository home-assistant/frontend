import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-select";
import { UNAVAILABLE } from "../../../data/entity/entity";
import { forwardHaptic } from "../../../data/haptics";
import type { SelectEntity } from "../../../data/select";
import { setSelectOption } from "../../../data/select";
import type { HomeAssistant } from "../../../types";
import type { EntitiesCardEntityConfig } from "../cards/types";
import { computeLovelaceEntityName } from "../common/entity/compute-lovelace-entity-name";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceRow } from "./types";

@customElement("hui-select-entity-row")
class HuiSelectEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntitiesCardEntityConfig;

  @state() private _selectedEntityRow?: string;

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

    const name = computeLovelaceEntityName(
      this.hass!,
      stateObj,
      this._config.name
    );

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        hide-name
      >
        <ha-select
          .label=${name}
          .value=${this._selectedEntityRow || stateObj.state}
          .options=${stateObj.attributes.options?.map((option) => ({
            value: option,
            label: this.hass!.formatEntityState(stateObj, option),
          }))}
          .disabled=${stateObj.state === UNAVAILABLE}
          @selected=${this._handleAction}
        >
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

  private _handleAction(ev: CustomEvent<{ value: string }>): void {
    const stateObj = this.hass!.states[this._config!.entity] as SelectEntity;

    const option = ev.detail.value;

    if (
      option === stateObj.state ||
      !stateObj.attributes.options.includes(option)
    ) {
      return;
    }

    forwardHaptic(this, "light");

    setSelectOption(this.hass!, stateObj.entity_id, option)
      .catch((_err) => {
        // silently swallow exception
      })
      .finally(() =>
        setTimeout(() => {
          const newStateObj = this.hass!.states[this._config!.entity];
          if (newStateObj === stateObj) {
            this._selectedEntityRow = stateObj.state;
          }
        }, 2000)
      );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-select-entity-row": HuiSelectEntityRow;
  }
}
