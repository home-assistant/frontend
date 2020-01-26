import {
  html,
  LitElement,
  TemplateResult,
  property,
  customElement,
  css,
  CSSResult,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";

import "../components/hui-image";

import { computeTooltip } from "../common/compute-tooltip";
import { LovelaceElement, ImageElementConfig } from "./types";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { handleAction } from "../common/handle-action";

@customElement("hui-image-element")
export class HuiImageElement extends LitElement implements LovelaceElement {
  @property() public hass?: HomeAssistant;
  @property() private _config?: ImageElementConfig;

  public setConfig(config: ImageElementConfig): void {
    if (!config) {
      throw Error("Error in element configuration");
    }

    this.classList.toggle(
      "clickable",
      config.tap_action && config.tap_action.action !== "none"
    );
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <hui-image
        .hass="${this.hass}"
        .entity="${this._config.entity}"
        .image="${this._config.image}"
        .stateImage="${this._config.state_image}"
        .cameraImage="${this._config.camera_image}"
        .filter="${this._config.filter}"
        .stateFilter="${this._config.state_filter}"
        .title="${computeTooltip(this.hass, this._config)}"
        .aspectRatio="${this._config.aspect_ratio}"
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) ? "0" : undefined
        )}
      ></hui-image>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host(.clickable) {
        cursor: pointer;
        overflow: hidden;
        -webkit-touch-callout: none !important;
      }
      hui-image {
        -webkit-user-select: none !important;
      }
      hui-image:focus {
        outline: none;
        background: var(--divider-color);
        border-radius: 100%;
      }
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-image-element": HuiImageElement;
  }
}
