import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "../../../components/ha-card";
import createHuiElement from "../common/create-hui-element";

import { HomeAssistant } from "../../../types";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceCard } from "../types";
import { LovelaceCardConfig, ActionConfig } from "../../../data/lovelace";
import { LovelaceElement } from "../elements/types";

interface Config extends LovelaceCardConfig {
  entity: string;
  title?: string;
  icon?: string;
  theme?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

class HuiButtonCard extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  private _hass?: HomeAssistant;
  private _config?: Config;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    for (const el of this.shadowRoot!.querySelectorAll("hui-button-element")) {
      const element = el as LovelaceElement;
      element.hass = this._hass;
    }
  }

  public getCardSize(): number {
    return 2;
  }

  public setConfig(config: Config): void {
    this._config = { theme: "default", ...config };
  }

  protected render(): TemplateResult {
    if (!this._config || !this._hass) {
      return html``;
    }

    const element = createHuiElement({
      type: "hui-button-element",
      ...this._config,
    }) as LovelaceElement;
    element.hass = this._hass;

    return html`
      <ha-card> ${element} </ha-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-card": HuiButtonCard;
  }
}

customElements.define("hui-button-card", HuiButtonCard);
