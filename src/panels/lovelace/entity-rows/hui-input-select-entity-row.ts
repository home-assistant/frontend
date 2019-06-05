import {
  html,
  LitElement,
  TemplateResult,
  property,
  css,
  CSSResult,
  customElement,
  PropertyValues,
} from "lit-element";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import "../../../components/ha-paper-dropdown-menu";
import "../../../components/entity/state-badge";
import "../components/hui-warning";

import computeStateName from "../../../common/entity/compute_state_name";

import { HomeAssistant, InputSelectEntity } from "../../../types";
import { EntityRow, EntityConfig } from "./types";
import { setInputSelectOption } from "../../../data/input-select";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { forwardHaptic } from "../../../data/haptics";
import { stopPropagation } from "../../../common/dom/stop_propagation";

@customElement("hui-input-select-entity-row")
class HuiInputSelectEntityRow extends LitElement implements EntityRow {
  @property() public hass?: HomeAssistant;

  @property() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity] as
      | InputSelectEntity
      | undefined;

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    return html`
      <state-badge .stateObj="${stateObj}"></state-badge>
      <ha-paper-dropdown-menu
        .label=${this._config.name || computeStateName(stateObj)}
        .value=${stateObj.state}
        @iron-select=${this._selectedChanged}
        @click=${stopPropagation}
      >
        <paper-listbox slot="dropdown-content">
          ${stateObj.attributes.options.map(
            (option) => html`
              <paper-item>${option}</paper-item>
            `
          )}
        </paper-listbox>
      </ha-paper-dropdown-menu>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!this.hass || !this._config) {
      return;
    }

    const stateObj = this.hass.states[this._config.entity] as
      | InputSelectEntity
      | undefined;

    if (!stateObj) {
      return;
    }

    // Update selected after rendering the items or else it won't work in Firefox
    this.shadowRoot!.querySelector(
      "paper-listbox"
    )!.selected = stateObj.attributes.options.indexOf(stateObj.state);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        align-items: center;
      }
      ha-paper-dropdown-menu {
        margin-left: 16px;
        flex: 1;
      }

      paper-item {
        cursor: pointer;
        min-width: 200px;
      }
    `;
  }

  private _selectedChanged(ev): void {
    const stateObj = this.hass!.states[this._config!.entity];
    const option = ev.target.selectedItem.innerText.trim();
    if (option === stateObj.state) {
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
