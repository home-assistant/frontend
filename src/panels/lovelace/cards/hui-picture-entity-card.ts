import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html/lib/shady-render";
import { classMap } from "lit-html/directives/classMap";

import "../../../components/ha-card";
import "../components/hui-image";

import computeDomain from "../../../common/entity/compute_domain";
import computeStateDisplay from "../../../common/entity/compute_state_display";
import computeStateName from "../../../common/entity/compute_state_name";

import { toggleEntity } from "../common/entity/toggle-entity";
import { longPress } from "../common/directives/long-press-directive";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { LovelaceCard } from "../types";
import { fireEvent } from "../../../common/dom/fire_event";

const UNAVAILABLE = "Unavailable";

interface Config extends LovelaceCardConfig {
  entity: string;
  name?: string;
  navigation_path?: string;
  image?: string;
  camera_image?: string;
  state_image?: {};
  aspect_ratio?: string;
  tap_action?: "toggle" | "call-service" | "more-info";
  hold_action?: "toggle" | "call-service" | "more-info";
  service?: string;
  service_data?: object;
  show_name?: boolean;
  show_state?: boolean;
}

class HuiPictureEntityCard extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
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

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass!.states[this._config.entity];

    if (!stateObj) {
      throw new Error("State Ojbect does not exist for this entity");
    }

    const available = !(stateObj.state === UNAVAILABLE);

    let footer = html``;
    const name = this._config.name || computeStateName(stateObj);
    const state = computeStateDisplay(
      this.localize,
      stateObj,
      this.hass.language
    );

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
      <ha-card
        id="card"
        @ha-click="${() => this.handleClick(false)}"
        @ha-hold="${() => this.handleClick(true)}"
        .longPress="${longPress()}"
        class="${
          classMap({
            clickable: Boolean(available),
          })
        }"
      >
        <hui-image
          .hass="${this.hass}"
          .image="${this._config.image}"
          .stateImage="${this._config.state_image}"
          .cameraImage="${
            computeDomain(this._config.entity) === "camera"
              ? this._config.entity
              : this._config.camera_imag
          }"
          .entity="${this._config.entity}"
          .aspectRatio="${this._config.aspect_ratio}"
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

  private handleClick(hold: boolean): void {
    const stateObj = this.hass!.states[this._config!.entity];
    const entityId = stateObj.entity_id;
    const action = hold
      ? this._config!.hold_action
      : this._config!.tap_action || "more-info";
    switch (action) {
      case "toggle":
        toggleEntity(this.hass!, entityId);
        break;
      case "call-service":
        if (!this._config!.service) {
          return;
        }
        const [domain, service] = this._config!.service!.split(".", 2);
        const serviceData = {
          entity_id: entityId,
          ...this._config!.service_data,
        };
        this.hass!.callService(domain, service, serviceData);
        break;
      case "more-info":
        fireEvent(this, "hass-more-info", { entityId });
        break;
      default:
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-entity-card": HuiPictureEntityCard;
  }
}

customElements.define("hui-picture-entity-card", HuiPictureEntityCard);
