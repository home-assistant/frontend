import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";

import "../../../components/ha-card";

import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { navigate } from "../../../common/navigate";
import { HomeAssistant } from "../../../types";
import { TemplateResult } from "lit-html";
import { classMap } from "lit-html/directives/classMap";
import { fireEvent } from "../../../common/dom/fire_event";

interface Config extends LovelaceCardConfig {
  image?: string;
  camera_image?: string;
  state_image?: {};
  aspect_ratio?: string;
  entity?: string;
  navigation_path?: string;
  service?: string;
  service_data?: object;
}

export class HuiPictureCard extends LitElement implements LovelaceCard {
  public hass?: HomeAssistant;
  protected _config?: Config;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: Config): void {
    if (
      !(config.image || config.camera_image || config.state_image) ||
      (config.state_image && !config.entity)
    ) {
      throw new Error("Invalid Configuration: 'image' required");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const isClickable =
      this._config.navigation_path ||
      this._config.camera_image ||
      this._config.service;

    return html`
      ${this.renderStyle()}
      <ha-card>
        <hui-image
          class="${
            classMap({
              clickable: Boolean(isClickable),
            })
          }"
          @click="${this._handleClick}"
          .hass="${this.hass}"
          .image="${this._config.image}"
          .stateImage="${this._config.state_image}"
          .cameraImage="${this._config.camera_image}"
          .entity="${this._config.entity}"
          .aspectRatio="${this._config.aspect_ratio}"
        ></hui-image>
      </ha-card>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        ha-card {
          overflow: hidden;
        }
        hui-image.clickable {
          cursor: pointer;
        }
      </style>
    `;
  }

  private _handleClick(): void {
    if (this._config!.navigation_path) {
      navigate(this, this._config!.navigation_path!);
    } else if (this._config!.camera_image) {
      fireEvent(this, "hass-more-info", {
        entityId: this._config!.camera_image!,
      });
    } else if (this._config!.service) {
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
