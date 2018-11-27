import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import { PaperInputElement } from "@polymer/paper-input/paper-input";

import "../components/hui-generic-entity-row";
import "./hui-error-entity-row";

import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";
import { setValue } from "../../../data/input_text";

class HuiInputTextEntityRow extends LitElement implements EntityRow {
  public hass?: HomeAssistant;
  private _config?: EntityConfig;

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

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-error-entity-row
          .entity="${this._config.entity}"
        ></hui-error-entity-row>
      `;
    }

    return renderTemplate(stateObj);
  }

  protected renderTemplate(stateObj): TemplateResult {
    return html`
      <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
        <paper-input
          no-label-float
          .value="${stateObj.state}"
          .minlength="${stateObj.attributes.min}"
          .maxlength="${stateObj.attributes.max}"
          .autoValidate="${stateObj.attributes.pattern}"
          .pattern="${stateObj.attributes.pattern}"
          .type="${stateObj.attributes.mode}"
          @change="${this._selectedValueChanged}"
          placeholder="(empty value)"
        ></paper-input>
      </hui-generic-entity-row>
    `;
  }

  private get _inputEl(): PaperInputElement {
    return this.shadowRoot!.querySelector("paper-input") as PaperInputElement;
  }

  private _selectedValueChanged(ev): void {
    const element = this._inputEl;
    const stateObj = this.hass!.states[this._config!.entity];

    if (element.value !== stateObj.state) {
      setValue(this.hass!, stateObj.entity_id, element.value!);
    }

    ev.target.blur();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-text-entity-row": HuiInputTextEntityRow;
  }
}

customElements.define("hui-input-text-entity-row", HuiInputTextEntityRow);
