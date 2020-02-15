import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";
import "@material/mwc-button";

import "../../../components/ha-icon";

import { LovelaceRow, ButtonRowConfig } from "../entity-rows/types";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { handleAction } from "../common/handle-action";

@customElement("hui-button-row")
export class HuiButtonRow extends LitElement implements LovelaceRow {
  public hass?: HomeAssistant;
  @property() private _config?: ButtonRowConfig;

  public setConfig(config: ButtonRowConfig): void {
    if (!config || !config.name || !config.service) {
      throw new Error("Error in card configuration.");
    }

    this._config = {
      icon: "hass:remote",
      tap_action: {
        action: "call-service",
        service: config.service,
        service_data: config.service_data,
      },
      ...config,
    };
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      <ha-icon .icon=${this._config.icon}></ha-icon>
      <div class="flex">
        <div>${this._config.name}</div>
        <mwc-button
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this._config!.hold_action),
            hasDoubleClick: hasAction(this._config!.double_tap_action),
          })}
          >${this._config.action_name
            ? this._config.action_name
            : this.hass!.localize("ui.card.service.run")}</mwc-button
        >
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        align-items: center;
      }
      ha-icon {
        padding: 8px;
        color: var(--paper-item-icon-color);
      }
      .flex {
        flex: 1;
        overflow: hidden;
        margin-left: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .flex div {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      mwc-button {
        margin-right: -0.57em;
      }
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-row": HuiButtonRow;
  }
}
