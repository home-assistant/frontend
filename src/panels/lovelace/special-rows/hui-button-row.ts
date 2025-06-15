import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-state-icon";
import "../../../components/ha-button";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import type { ButtonRowConfig, LovelaceRow } from "../entity-rows/types";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";

@customElement("hui-button-row")
export class HuiButtonRow extends LitElement implements LovelaceRow {
  public hass?: HomeAssistant;

  @state() private _config?: ButtonRowConfig;

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

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const stateObj =
      this._config.entity && this.hass
        ? this.hass.states[this._config.entity]
        : undefined;

    const name =
      this._config.name ?? (stateObj ? computeStateName(stateObj) : "");

    return html`
      <ha-state-icon
        .icon=${this._config.icon}
        .stateObj=${stateObj}
        .hass=${this.hass}
      >
      </ha-state-icon>
      <div class="flex">
        <div .title=${name}>${name}</div>
        <ha-button
          appearance="filled"
          size="small"
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this._config!.hold_action),
            hasDoubleClick: hasAction(this._config!.double_tap_action),
          })}
          >${this._config.action_name
            ? this._config.action_name
            : this.hass!.localize("ui.card.service.run")}</ha-button
        >
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
    }
    ha-state-icon {
      padding: 8px;
      color: var(--state-icon-color);
    }
    .flex {
      flex: 1;
      overflow: hidden;
      margin-left: 16px;
      margin-inline-start: 16px;
      margin-inline-end: initial;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .flex div {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    ha-button {
      margin-right: -0.57em;
      margin-inline-end: -0.57em;
      margin-inline-start: initial;
    }
  `;

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-row": HuiButtonRow;
  }
}
