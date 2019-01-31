import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import "../../../components/ha-card";
import "../components/hui-image";

import computeDomain from "../../../common/entity/compute_domain";
import computeStateDisplay from "../../../common/entity/compute_state_display";
import computeStateName from "../../../common/entity/compute_state_name";

import { longPress } from "../common/directives/long-press-directive";
import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig, ActionConfig } from "../../../data/lovelace";
import { LovelaceCard } from "../types";
import { handleClick } from "../common/handle-click";
import { UNAVAILABLE } from "../../../data/entity";
import {
  createErrorCardElement,
  createErrorCardConfig,
} from "./hui-error-card";

interface Config extends LovelaceCardConfig {
  entity: string;
  name?: string;
  image?: string;
  camera_image?: string;
  state_image?: {};
  aspect_ratio?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  show_name?: boolean;
  show_state?: boolean;
}

class HuiPictureEntityCard extends LitElement implements LovelaceCard {
  public hass?: HomeAssistant;
  private _config?: Config;

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
    if (!config || !config.entity) {
      throw new Error("Invalid Configuration: 'entity' required");
    }

    if (
      computeDomain(config.entity) !== "camera" &&
      (!config.image && !config.state_image && !config.camera_image)
    ) {
      throw new Error("No image source configured.");
    }

    this._config = { show_name: true, show_state: true, ...config };
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        ${createErrorCardElement(
          createErrorCardConfig(
            `Entity not found: ${this._config.entity}`,
            this._config
          )
        )}
      `;
    }

    const name = this._config.name || computeStateName(stateObj);
    const state = computeStateDisplay(
      this.hass!.localize,
      stateObj,
      this.hass.language
    );

    let footer: TemplateResult | string = "";
    if (this._config.show_name && this._config.show_state) {
      footer = html`
        <div class="footer both">
          <div>${name}</div>
          <div>${state}</div>
        </div>
      `;
    } else if (this._config.show_name) {
      footer = html`
        <div class="footer">${name}</div>
      `;
    } else if (this._config.show_state) {
      footer = html`
        <div class="footer state">${state}</div>
      `;
    }

    return html`
      ${this.renderStyle()}
      <ha-card>
        <hui-image
          .hass="${this.hass}"
          .image="${this._config.image}"
          .stateImage="${this._config.state_image}"
          .cameraImage="${computeDomain(this._config.entity) === "camera"
            ? this._config.entity
            : this._config.camera_image}"
          .entity="${this._config.entity}"
          .aspectRatio="${this._config.aspect_ratio}"
          @ha-click="${this._handleTap}"
          @ha-hold="${this._handleHold}"
          .longPress="${longPress()}"
          class="${classMap({
            clickable: stateObj.state !== UNAVAILABLE,
          })}"
        ></hui-image>
        ${footer}
      </ha-card>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        ha-card {
          min-height: 75px;
          overflow: hidden;
          position: relative;
        }
        hui-image.clickable {
          cursor: pointer;
        }
        .footer {
          @apply --paper-font-common-nowrap;
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.3);
          padding: 16px;
          font-size: 16px;
          line-height: 16px;
          color: white;
        }
        .both {
          display: flex;
          justify-content: space-between;
        }
        .state {
          text-align: right;
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
    "hui-picture-entity-card": HuiPictureEntityCard;
  }
}

customElements.define("hui-picture-entity-card", HuiPictureEntityCard);
