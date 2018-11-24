import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";

import "../../../components/ha-card";

import { LovelaceCard, LovelaceCardConfig } from "../types";
import { navigate } from "../../../common/navigate";
import { HomeAssistant } from "../../../types";
import { TemplateResult } from "lit-html";
import { classMap } from "lit-html/directives/classMap";

interface Config extends LovelaceCardConfig {
  image?: string;
  navigation_path?: string;
  service?: string;
  service_data?: object;
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
        @click="${this.handleClick}"
        class="${
          classMap({
            clickable: Boolean(
              this._config.navigation_path || this._config.service
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

  private handleClick(): void {
    if (this._config!.navigation_path) {
      navigate(this, this._config!.navigation_path!);
    }
    if (this._config!.service) {
      const [domain, service] = this._config!.service!.split(".", 2);
      this.hass!.callService(domain, service, this._config!.service_data);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-card": HuiPictureCard;
  }
}

customElements.define("hui-picture-card", HuiPictureCard);
