import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";

import "../../../components/ha-card";

import { LovelaceHeaderFooter } from "../types";
import { HomeAssistant } from "../../../types";
import { classMap } from "lit-html/directives/class-map";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { handleAction } from "../common/handle-action";
import { ifDefined } from "lit-html/directives/if-defined";
import { PictureHeaderFooterConfig } from "./types";

@customElement("hui-picture-header-footer")
export class HuiPictureHeaderFooter extends LitElement
  implements LovelaceHeaderFooter {
  public static getStubConfig(): object {
    return {
      image:
        "https://www.home-assistant.io/images/merchandise/shirt-frontpage.png",
      tap_action: { action: "none" },
      hold_action: { action: "none" },
    };
  }

  public hass?: HomeAssistant;

  @property() protected _config?: PictureHeaderFooterConfig;

  public setConfig(config: PictureHeaderFooterConfig): void {
    if (!config || !config.image) {
      throw new Error("Invalid Configuration: 'image' required");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const clickable = Boolean(
      this._config.tap_action || this._config.hold_action
    );

    return html`
      <img
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(clickable ? 0 : undefined)}
        class="${classMap({
          clickable,
        })}"
        <img
        src="${this.hass.hassUrl(this._config.image)}"
      />
    `;
  }

  static get styles(): CSSResult {
    return css`
      img.clickable {
        cursor: pointer;
      }

      img {
        display: block;
        width: 100%;
      }
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-header-footer": HuiPictureHeaderFooter;
  }
}
