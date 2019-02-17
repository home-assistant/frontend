import {
  html,
  LitElement,
  TemplateResult,
  property,
  css,
  CSSResult,
} from "lit-element";
import { repeat } from "lit-html/directives/repeat";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import "../../../components/entity/state-badge";
import "../components/hui-warning";

import computeStateName from "../../../common/entity/compute_state_name";
import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";
import { setOption } from "../../../data/input-select";

class HuiInputSelectEntityRow extends LitElement implements EntityRow {
  @property() public hass?: HomeAssistant;
  @property() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning .entity="${this._config.entity}"></hui-warning>
      `;
    }

    return html`
      <state-badge .stateObj="${stateObj}"></state-badge>
      <paper-dropdown-menu
        selected-item-label="${stateObj.state}"
        @selected-item-label-changed="${this._selectedChanged}"
        label="${this._config.name || computeStateName(stateObj)}"
      >
        <paper-listbox
          slot="dropdown-content"
          selected="${stateObj.attributes.options.indexOf(stateObj.state)}"
        >
          ${repeat(
            stateObj.attributes.options,
            (option) =>
              html`
                <paper-item>${option}</paper-item>
              `
          )}
        </paper-listbox>
      </paper-dropdown-menu>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        align-items: center;
      }
      paper-dropdown-menu {
        margin-left: 16px;
        flex: 1;
      }
    `;
  }

  private _selectedChanged(ev): void {
    // Selected Option will transition to '' before transitioning to new value
    const stateObj = this.hass!.states[this._config!.entity];
    if (
      !ev.target.selectedItem ||
      ev.target.selectedItem.innerText === "" ||
      ev.target.selectedItem.innerText === stateObj.state
    ) {
      return;
    }

    setOption(this.hass!, stateObj.entity_id, ev.target.selectedItem.innerText);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-select-entity-row": HuiInputSelectEntityRow;
  }
}

customElements.define("hui-input-select-entity-row", HuiInputSelectEntityRow);
