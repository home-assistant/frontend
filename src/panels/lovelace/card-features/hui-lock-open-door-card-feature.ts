import { consume } from "@lit/context";
import { mdiCheck } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import { apiContext } from "../../../data/context";
import {
  callProtectedLockService,
  canOpen,
  LockEntityFeature,
  type LockEntity,
} from "../../../data/lock";
import type { HomeAssistant, HomeAssistantApi } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LockOpenDoorCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsLockOpenDoorCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "lock" && supportsFeature(stateObj, LockEntityFeature.OPEN);
};

export const supportsLockOpenDoorCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsLockOpenDoorCardFeatureFromState(stateObj);
};

const CONFIRM_TIMEOUT_SECOND = 5;
const DONE_TIMEOUT_SECOND = 2;

type ButtonState = "normal" | "confirm" | "done";

@customElement("hui-lock-open-door-card-feature")
class HuiLockOpenDoorCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: LockEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

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
    if (!this._stateObj) {
      return;
    }
    callProtectedLockService(
      this,
      {
        callService: this._api.callService,
        callWS: this._api.callWS,
        localize: this._localize,
      },
      this._stateObj,
      "open"
    );

    this._setButtonState("done", DONE_TIMEOUT_SECOND);
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsLockOpenDoorCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    return html`
      ${this._buttonState === "done"
        ? html`
            <p class="open-done">
              <ha-svg-icon path=${mdiCheck}></ha-svg-icon>
              ${this._localize("ui.card.lock.open_door_done")}
            </p>
          `
        : html`
            <ha-control-button-group>
              <ha-control-button
                .disabled=${!canOpen(this._stateObj)}
                class="open-button ${this._buttonState}"
                @click=${this._open}
              >
                ${this._buttonState === "confirm"
                  ? this._localize("ui.card.lock.open_door_confirm")
                  : this._localize("ui.card.lock.open_door")}
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
          font-size: var(--ha-font-size-m);
        }
        .open-button {
          width: 130px;
        }
        .open-button.confirm {
          --control-button-background-color: var(--warning-color);
        }
        .open-done {
          font-size: var(--ha-font-size-m);
          line-height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: row;
          gap: var(--ha-space-2);
          font-weight: var(--ha-font-weight-medium);
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
