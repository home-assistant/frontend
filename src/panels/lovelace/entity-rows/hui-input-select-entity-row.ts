import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { repeat } from "lit-html/directives/repeat";
import { TemplateResult } from "lit-html";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import "../../../components/entity/state-badge";
import "./hui-error-entity-row";

import computeStateName from "../../../common/entity/compute_state_name";
import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";
import { setOption } from "../../../data/input-select";

class HuiInputSelectEntityRow extends LitElement implements EntityRow {
  public hass?: HomeAssistant;
  private _config?: EntityConfig;
  private _selected?: string;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
      _selected: {},
    };
  }

  public setConfig(config: EntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-error-entity-row
          .entity="${this._config.entity}"
        ></hui-error-entity-row>
      `;
    }

    return html`
      ${this.renderStyle()}
      <state-badge .stateObj="${stateObj}"></state-badge>
      <paper-dropdown-menu
        selected-item-label="${this._selected}"
        @selected-item-label-changed="${this._selectedChanged}"
        label="${this._config.name || computeStateName(stateObj)}"
      >
        <paper-listbox
          slot="dropdown-content"
          selected="${stateObj.attributes.options.indexOf(stateObj.state)}"
        >
          ${
            repeat(
              stateObj.attributes.options,
              (option) =>
                html`
                  <paper-item>${option}</paper-item>
                `
            )
          }
        </paper-listbox>
      </paper-dropdown-menu>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        :host {
          display: flex;
          align-items: center;
        }
        paper-dropdown-menu {
          margin-left: 16px;
          flex: 1;
        }
      </style>
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

    this._selected = ev.target.selectedItem.innerText;
    setOption(this.hass!, stateObj.entity_id, this._selected!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-select-entity-row": HuiInputSelectEntityRow;
  }
}

customElements.define("hui-input-select-entity-row", HuiInputSelectEntityRow);
