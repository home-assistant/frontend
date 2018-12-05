import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";

import "../../../components/ha-card";

import { LovelaceCard } from "../types";
import { LovelaceCardConfig, ActionConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { TemplateResult } from "lit-html";
import { classMap } from "lit-html/directives/classMap";
import { handleClick } from "../common/handle-click";
import { longPress } from "../common/directives/long-press-directive";

interface Config extends LovelaceCardConfig {
  image?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

export class HuiPictureCard extends LitElement implements LovelaceCard {
  public hass?: HomeAssistant;
  protected _config?: Config;

  static get properties(): PropertyDeclarations {
    return {
      _config: {},
    };
  }

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: Config): void {
    if (!config || !config.image) {
      throw new Error("Invalid Configuration: 'image' required");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <ha-card
        @ha-click="${this._handleTap}"
        @ha-hold="${this._handleHold}"
        .longPress="${longPress()}"
        class="${
          classMap({
            clickable: Boolean(
              this._config.tap_action || this._config.hold_action
            ),
          })
        }"
      >
        <img src="${this._config.image}" />
      </ha-card>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        ha-card {
          overflow: hidden;
        }
        ha-card.clickable {
          cursor: pointer;
        }
        img {
          display: block;
          width: 100%;
        }
      </style>
    `;
  }

  private _handleTap() {
    handleClick(this, this.hass!, this._config!, false);
  }

  private _handleHold() {
    handleClick(this, this.hass!, this._config!, true);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-card": HuiPictureCard;
  }
}

customElements.define("hui-picture-card", HuiPictureCard);
