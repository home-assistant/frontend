import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { PaperToggleButtonElement } from "@polymer/paper-toggle-button/paper-toggle-button";

import { DOMAINS_TOGGLE } from "../../../common/const";
import { turnOnOffEntities } from "../common/entity/turn-on-off-entities";
import { HomeAssistant } from "../../../types";

class HuiEntitiesToggle extends LitElement {
  public entities?: string[];
  protected hass?: HomeAssistant;
  private _toggleEntities?: string[];

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      entities: {},
      _toggleEntities: {},
    };
  }

  public updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has("entities")) {
      this._toggleEntities = this.entities!.filter(
        (entityId) =>
          entityId in this.hass!.states &&
          DOMAINS_TOGGLE.has(entityId.split(".", 1)[0])
      );
    }
  }

  protected render(): TemplateResult | void {
    if (!this._toggleEntities) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <paper-toggle-button
        ?checked="${
          this._toggleEntities!.some(
            (entityId) => this.hass!.states[entityId].state === "on"
          )
        }"
        @change="${this._callService}"
      ></paper-toggle-button>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        :host {
          width: 38px;
          display: block;
        }
        paper-toggle-button {
          cursor: pointer;
          --paper-toggle-button-label-spacing: 0;
          padding: 13px 5px;
          margin: -4px -5px;
        }
      </style>
    `;
  }

  private _callService(ev: MouseEvent): void {
    const turnOn = (ev.target as PaperToggleButtonElement).checked;
    turnOnOffEntities(this.hass!, this._toggleEntities!, turnOn!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-toggle": HuiEntitiesToggle;
  }
}

customElements.define("hui-entities-toggle", HuiEntitiesToggle);
