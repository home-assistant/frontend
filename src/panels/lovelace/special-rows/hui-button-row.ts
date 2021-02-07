import "@material/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  TemplateResult,
} from "lit-element";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateIcon } from "../../../common/entity/state_icon";
import "../../../components/ha-icon";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { ButtonRowConfig, LovelaceRow } from "../entity-rows/types";

@customElement("hui-button-row")
export class HuiButtonRow extends LitElement implements LovelaceRow {
  public hass?: HomeAssistant;

  @internalProperty() private _config?: ButtonRowConfig;

  public setConfig(config: ButtonRowConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }

    if (!config.name && !config.entity) {
      throw new Error("No name and no entity specified");
    }

    this._config = {
      tap_action: {
        action:
          config.entity && DOMAINS_TOGGLE.has(computeDomain(config.entity))
            ? "toggle"
            : "more-info",
      },
      hold_action: { action: "more-info" },
      ...config,
    };
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    const stateObj =
      this._config.entity && this.hass
        ? this.hass.states[this._config.entity]
        : undefined;

    return html`
      <ha-icon
        .icon=${this._config.icon ||
        (stateObj ? stateIcon(stateObj) : "hass:remote")}
      >
      </ha-icon>
      <div class="flex">
        <div>
          ${this._config.name || (stateObj ? computeStateName(stateObj) : "")}
        </div>
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
