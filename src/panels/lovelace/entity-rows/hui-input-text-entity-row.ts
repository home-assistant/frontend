import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import { PaperInputElement } from "@polymer/paper-input/paper-input";

import "../components/hui-generic-entity-row";
import "./hui-error-entity-row";

import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";
import { HassEntity } from "home-assistant-js-websocket";

class HuiInputTextEntityRow extends LitElement implements EntityRow {
  public hass?: HomeAssistant;
  private _config?: EntityConfig;
  private _stateObj?: HassEntity;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Configuration error");
    }
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    this._stateObj = this.hass.states[this._config.entity];

    if (!this._stateObj) {
      return html`
        <hui-error-entity-row
          .entity="${this._config.entity}"
        ></hui-error-entity-row>
      `;
    }

    return html`
      <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
        <paper-input
          class="value"
          no-label-float
          .value="${this._stateObj.state}"
          .minlength="${this._stateObj.attributes.min}"
          .maxlength="${this._stateObj.attributes.max}"
          .autoValidate="${this._stateObj.attributes.pattern}"
          .pattern="${this._stateObj.attributes.pattern}"
          .type="${this._stateObj.attributes.mode}"
          @change="${this._selectedValueChanged}"
          .placeholder="(empty value)"
        ></paper-input>
      </hui-generic-entity-row>
    `;
  }

  private get _value(): PaperInputElement {
    return this.shadowRoot!.querySelector(".value") as PaperInputElement;
  }

  private _selectedValueChanged(ev): void {
    const value = this._value;

    if (value.value === this._stateObj!.state) {
      return;
    }

    this.hass!.callService("input_text", "set_value", {
      value: value.value,
      entity_id: this._stateObj!.entity_id,
    });

    ev.target.blur();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-text-entity-row": HuiInputTextEntityRow;
  }
}

customElements.define("hui-input-text-entity-row", HuiInputTextEntityRow);
