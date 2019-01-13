import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";

import "../../../components/ha-card";

import { LovelaceCard, LovelaceCardEditor } from "../types";
import { LovelaceCardConfig, ActionConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { classMap } from "lit-html/directives/class-map";
import { handleClick } from "../common/handle-click";
import { longPress } from "../common/directives/long-press-directive";

export interface Config extends LovelaceCardConfig {
  image?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

export class HuiPictureCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-picture-card-editor" */ "../editor/config-elements/hui-picture-card-editor");
    return document.createElement("hui-picture-card-editor");
  }
  public static getStubConfig(): object {
    return {
      image:
        "https://www.home-assistant.io/images/merchandise/shirt-frontpage.png",
      tap_action: { action: "none" },
      hold_action: { action: "none" },
    };
  }

  public hass?: HomeAssistant;
  protected _config?: Config;

  static get properties(): PropertyDeclarations {
    return { _config: {} };
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

  protected render(): TemplateResult | void {
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
