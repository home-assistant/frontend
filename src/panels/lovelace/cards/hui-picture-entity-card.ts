import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
  PropertyValues,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import "../../../components/ha-card";
import "../components/hui-image";
import "../components/hui-warning";

import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";

import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { longPress } from "../common/directives/long-press-directive";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { handleClick } from "../common/handle-click";
import { UNAVAILABLE } from "../../../data/entity";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { PictureEntityCardConfig } from "./types";
import { hasDoubleClick } from "../common/has-double-click";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";

@customElement("hui-picture-entity-card")
class HuiPictureEntityCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-picture-entity-card-editor" */ "../editor/config-elements/hui-picture-entity-card-editor");
    return document.createElement("hui-picture-entity-card-editor");
  }
  public static getStubConfig(): object {
    return {
      entity: "",
      image:
        "https://www.home-assistant.io/images/merchandise/shirt-frontpage.png",
    };
  }

  @property() public hass?: HomeAssistant;

  @property() private _config?: PictureEntityCardConfig;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: PictureEntityCardConfig): void {
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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.themes !== this.hass.themes) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
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
      <ha-card>
        <hui-image
          .hass=${this.hass}
          .image=${this._config.image}
          .stateImage=${this._config.state_image}
          .stateFilter=${this._config.state_filter}
          .cameraImage=${computeDomain(this._config.entity) === "camera"
            ? this._config.entity
            : this._config.camera_image}
          .cameraView=${this._config.camera_view}
          .entity=${this._config.entity}
          .aspectRatio=${this._config.aspect_ratio}
          @ha-click=${this._handleClick}
          @ha-hold=${this._handleHold}
          @ha-dblclick=${this._handleDblClick}
          .longPress=${longPress({
            hasDoubleClick: hasDoubleClick(this._config!.double_tap_action),
          })}
          class=${classMap({
            clickable: stateObj.state !== UNAVAILABLE,
          })}
        ></hui-image>
        ${footer}
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        min-height: 75px;
        overflow: hidden;
        position: relative;
      }

      hui-image.clickable {
        cursor: pointer;
      }

      .footer {
        /* start paper-font-common-nowrap style */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        /* end paper-font-common-nowrap style */

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
    `;
  }

  private _handleClick() {
    handleClick(this, this.hass!, this._config!, false, false);
  }

  private _handleHold() {
    handleClick(this, this.hass!, this._config!, true, false);
  }

  private _handleDblClick() {
    handleClick(this, this.hass!, this._config!, false, true);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-entity-card": HuiPictureEntityCard;
  }
}
