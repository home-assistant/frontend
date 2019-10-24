import {
  html,
  LitElement,
  TemplateResult,
  property,
  css,
  CSSResult,
  customElement,
} from "lit-element";

import "../../../components/ha-icon";

import { computeTooltip } from "../common/compute-tooltip";
import { LovelaceElement, IconElementConfig } from "./types";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { handleAction } from "../common/handle-action";

@customElement("hui-icon-element")
export class HuiIconElement extends LitElement implements LovelaceElement {
  public hass?: HomeAssistant;
  @property() private _config?: IconElementConfig;

  public setConfig(config: IconElementConfig): void {
    if (!config.icon) {
      throw Error("Invalid Configuration: 'icon' required");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <ha-icon
        .icon="${this._config.icon}"
        .title="${computeTooltip(this.hass, this._config)}"
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
      ></ha-icon>
    `;
  }

  private _handleAction(ev: HASSDomEvent<ActionHandlerEvent>) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-icon-element": HuiIconElement;
  }
}
