import { mdiCheck } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";

import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import {
  callProtectedLockService,
  canOpen,
  LockEntityFeature,
} from "../../../data/lock";
import { HomeAssistant } from "../../../types";
import { LovelaceCardFeature } from "../types";
import { LockOpenDoorCardFeatureConfig } from "./types";
import { cardFeatureStyles } from "./common/card-feature-styles";

export const supportsLockOpenDoorCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "lock" && supportsFeature(stateObj, LockEntityFeature.OPEN);
};

const CONFIRM_TIMEOUT_SECOND = 5;
const DONE_TIMEOUT_SECOND = 2;

type ButtonState = "normal" | "confirm" | "done";

@customElement("hui-lock-open-door-card-feature")
class HuiLockOpenDoorCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() public _buttonState: ButtonState = "normal";

  @state() private _config?: LockOpenDoorCardFeatureConfig;

  private _buttonTimeout?: number;

  static getStubConfig(): LockOpenDoorCardFeatureConfig {
    return {
      type: "lock-open-door",
    };
  }

  public setConfig(config: LockOpenDoorCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _setButtonState(buttonState: ButtonState, timeoutSecond?: number) {
    clearTimeout(this._buttonTimeout);
    this._buttonState = buttonState;
    if (timeoutSecond) {
      this._buttonTimeout = window.setTimeout(() => {
        this._buttonState = "normal";
      }, timeoutSecond * 1000);
    }
  }

  private async _open() {
    if (this._buttonState !== "confirm") {
      this._setButtonState("confirm", CONFIRM_TIMEOUT_SECOND);
      return;
    }
    if (!this.hass || !this.stateObj) {
      return;
    }
    callProtectedLockService(this, this.hass, this.stateObj!, "open");

    this._setButtonState("done", DONE_TIMEOUT_SECOND);
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsLockOpenDoorCardFeature(this.stateObj)
    ) {
      return nothing;
    }

    return html`
      ${this._buttonState === "done"
        ? html`
            <p class="open-done">
              <ha-svg-icon path=${mdiCheck}></ha-svg-icon>
              ${this.hass.localize("ui.card.lock.open_door_done")}
            </p>
          `
        : html`
            <ha-control-button-group>
              <ha-control-button
                .disabled=${!canOpen(this.stateObj)}
                class="open-button ${this._buttonState}"
                @click=${this._open}
              >
                ${this._buttonState === "confirm"
                  ? this.hass.localize("ui.card.lock.open_door_confirm")
                  : this.hass.localize("ui.card.lock.open_door")}
              </ha-control-button>
            </ha-control-button-group>
          `}
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      cardFeatureStyles,
      css`
        ha-control-button {
          font-size: 14px;
        }
        .open-button {
          width: 130px;
        }
        .open-button.confirm {
          --control-button-background-color: var(--warning-color);
        }
        .open-done {
          font-size: 14px;
          line-height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: row;
          gap: 8px;
          font-weight: 500;
          color: var(--success-color);
          margin: 0 12px 12px 12px;
          height: 40px;
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-lock-open-door-card-feature": HuiLockOpenDoorCardFeature;
  }
}
