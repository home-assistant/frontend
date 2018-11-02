import { html, LitElement } from "@polymer/lit-element";

import "../../../components/ha-icon";

import { computeTooltip } from "../common/compute-tooltip";
import { handleClick } from "../common/handle-click";
import { longPress } from "../common/directives/long-press-directive";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceElement, LovelaceElementConfig } from "./types";
import { HomeAssistant } from "../../../types";
import { TemplateResult } from "lit-html";

interface Config extends LovelaceElementConfig {
  icon: string;
}

export class HuiIconElement extends hassLocalizeLitMixin(LitElement)
  implements LovelaceElement {
  public hass?: HomeAssistant;
  private _config?: Config;

  static get properties() {
    return { hass: {}, _config: {} };
  }

  public setConfig(config: Config): void {
    if (!config.icon) {
      throw Error("Invalid Configuration: 'icon' required");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <ha-icon
        .icon="${this._config.icon}"
        .title="${computeTooltip(this.hass!, this._config)}"
        @ha-click="${() => handleClick(this, this.hass!, this._config!, false)}"
        @ha-hold="${() => handleClick(this, this.hass!, this._config!, true)}"
        .longPress="${longPress()}"
      ></ha-icon>
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-icon-element": HuiIconElement;
  }
}

customElements.define("hui-icon-element", HuiIconElement);
