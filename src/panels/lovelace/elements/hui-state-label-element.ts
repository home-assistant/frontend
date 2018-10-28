import { html, LitElement } from "@polymer/lit-element";

import "../../../components/entity/ha-state-label-badge.js";

import { computeTooltip } from "../../../common/string/compute-tooltip";
import computeStateDisplay from "../../../common/entity/compute_state_display.js";
import { handleClick } from "../../../common/dom/handle-click";
import { longPress } from "../common/directives/long-press-directive";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceElement, LovelaceElementConfig } from "./types.js";
import { HomeAssistant } from "../../../types.js";
import { TemplateResult } from "lit-html";

interface Config extends LovelaceElementConfig {
  prefix?: string;
  suffix?: string;
}

class HuiStateLabelElement extends hassLocalizeLitMixin(LitElement)
  implements LovelaceElement {
  public hass?: HomeAssistant;
  private _config?: Config;

  static get properties() {
    return { hass: {}, _config: {} };
  }

  public setConfig(config: Config): void {
    if (!config.entity) {
      throw Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    const state = this.hass!.states[this._config.entity!];
    return html`
      ${this.renderStyle()}
      <div
        .title="${computeTooltip(this.hass!, this._config)}"
        @ha-click="${() => handleClick(this, this.hass!, this._config!, false)}"
        @ha-hold="${() => handleClick(this, this.hass!, this._config!, true)}"
        .longPress="${longPress()}"
      >
      ${this._config.prefix}${
      state ? computeStateDisplay(this.localize, state) : "-"
    }${this._config.suffix}
      </div>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        :host {
          cursor: pointer;
        }
        div {
          padding: 8px;
          white-space: nowrap;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-label-element": HuiStateLabelElement;
  }
}

customElements.define("hui-state-label-element", HuiStateLabelElement);
