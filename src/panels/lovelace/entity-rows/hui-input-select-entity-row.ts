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

class HuiInputSelectEntityRow extends LitElement implements EntityRow {
  public hass?: HomeAssistant;
  private _config?: EntityConfig;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
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
                  <paper-item
                    @click="${() => this._selectedChanged(option as string)}"
                    >${option}</paper-item
                  >
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

  private _selectedChanged(option: string): void {
    // Selected Option will transition to '' before transitioning to new value
    const stateObj = this.hass!.states[this._config!.entity];
    if (option === "" || option === stateObj.state) {
      return;
    }
    this.hass!.callService("input_select", "select_option", {
      option,
      entity_id: stateObj.entity_id,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-select-entity-row": HuiInputSelectEntityRow;
  }
}

customElements.define("hui-input-select-entity-row", HuiInputSelectEntityRow);
