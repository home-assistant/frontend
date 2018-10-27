import { html, LitElement } from "@polymer/lit-element";

import "../../../components/ha-icon.js";

import { computeTooltip } from "../../../common/string/compute-tooltip";
import { handleClick } from "../../../common/dom/handle-click";
import { longPress } from "../common/directives/long-press-directive";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceElement, LovelaceElementConfig } from "./types.js";
import { HomeAssistant } from "../../../types.js";

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

  public setConfig(config: Config) {
    if (!config.icon) {
      throw Error("Invalid Configuration: 'icon' required");
    }

    this._config = config;
  }

  protected render() {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <ha-icon
        .icon="${this._config.icon}"
        .title="${computeTooltip(this.hass!, this._config)}"
        @ha-click="${(ev) => handleClick(ev, this.hass!, this._config!, false)}"
        @ha-hold="${(ev) => handleClick(ev, this.hass!, this._config!, true)}"
        .longPress="${longPress()}"
      ></ha-icon>
    `;
  }

  private renderStyle() {
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
