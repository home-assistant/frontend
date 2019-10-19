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

import "../../../components/ha-card";

import { LovelaceCard, LovelaceCardEditor } from "../types";
import { HomeAssistant } from "../../../types";
import { classMap } from "lit-html/directives/class-map";
import { handleClick } from "../common/handle-click";
import { longPress } from "../common/directives/long-press-directive";
import { PictureCardConfig } from "./types";
import { hasDoubleClick } from "../common/has-double-click";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";

@customElement("hui-picture-card")
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

  @property() protected _config?: PictureCardConfig;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: PictureCardConfig): void {
    if (!config || !config.image) {
      throw new Error("Invalid Configuration: 'image' required");
    }

    this._config = config;
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

    return html`
      <ha-card
        @ha-click=${this._handleClick}
        @ha-hold=${this._handleHold}
        @ha-dblclick=${this._handleDblClick}
        .longPress=${longPress({
          hasDoubleClick: hasDoubleClick(this._config!.double_tap_action),
        })}
        class="${classMap({
          clickable: Boolean(
            this._config.tap_action || this._config.hold_action
          ),
        })}"
      >
        <img src="${this.hass.hassUrl(this._config.image)}" />
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
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
    "hui-picture-card": HuiPictureCard;
  }
}
