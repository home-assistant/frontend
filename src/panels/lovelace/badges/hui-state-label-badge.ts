import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  CSSResult,
  css,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";

import "../../../components/entity/ha-state-label-badge";
import "../components/hui-warning-element";

import { LovelaceBadge } from "../types";
import { HomeAssistant } from "../../../types";
import { StateLabelBadgeConfig } from "./types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { handleAction } from "../common/handle-action";

@customElement("hui-state-label-badge")
export class HuiStateLabelBadge extends LitElement implements LovelaceBadge {
  @property() public hass?: HomeAssistant;
  @property() protected _config?: StateLabelBadgeConfig;

  public setConfig(config: StateLabelBadgeConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity!];

    return html`
      <ha-state-label-badge
        .hass=${this.hass}
        .state=${stateObj}
        .name=${this._config.name}
        .icon=${this._config.icon}
        .image=${this._config.image}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) || this._config.entity
            ? "0"
            : undefined
        )}
      ></ha-state-label-badge>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static get styles(): CSSResult {
    return css`
      ha-state-label-badge:focus {
        outline: none;
        background: var(--divider-color);
        border-radius: 4px;
      }
      ha-state-label-badge {
        display: inline-block;
        padding: 4px;
        margin: -4px 0 -4px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-label-badge": HuiStateLabelBadge;
  }
}
