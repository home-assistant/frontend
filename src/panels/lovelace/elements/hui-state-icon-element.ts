import { html, LitElement } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "../../../components/entity/state-badge.js";

import { computeTooltip } from "../../../common/string/compute-tooltip";
import { handleClick } from "../../../common/dom/handle-click";
import { longPress } from "../common/directives/long-press-directive";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceElement, LovelaceElementConfig } from "./types.js";
import { HomeAssistant } from "../../../types.js";

export class HuiStateIconElement extends hassLocalizeLitMixin(LitElement)
  implements LovelaceElement {
  public hass?: HomeAssistant;
  private _config?: LovelaceElementConfig;

  static get properties() {
    return { hass: {}, _config: {} };
  }

  public setConfig(config: LovelaceElementConfig): void {
    if (!config.entity) {
      throw Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (
      !this._config ||
      !this.hass ||
      !this.hass.states[this._config.entity!]
    ) {
      return html``;
    }

    const state = this.hass!.states[this._config.entity!];
    return html`
      ${this.renderStyle()}
      <state-badge
        .stateObj=${state}
        .title="${computeTooltip(this.hass!, this._config)}"
        @ha-click="${this._handleClick}"
        @ha-hold="${this._handleHold}"
        .longPress="${longPress()}"
      ></state-badge>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        :host {
          cursor: pointer;
        }
      </style>
    `;
  }

  private _handleClick() {
    handleClick(this, this.hass!, this._config!, false);
  }

  private _handleHold() {
    handleClick(this, this.hass!, this._config!, true);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-icon-element": HuiStateIconElement;
  }
}

customElements.define("hui-state-icon-element", HuiStateIconElement);
