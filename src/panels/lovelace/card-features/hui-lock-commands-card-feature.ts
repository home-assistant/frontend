import { consume } from "@lit/context";
import { mdiLock, mdiLockOpenVariant } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import { apiContext } from "../../../data/context";
import { forwardHaptic } from "../../../data/haptics";
import {
  callProtectedLockService,
  canLock,
  canUnlock,
  type LockEntity,
} from "../../../data/lock";
import type { HomeAssistant, HomeAssistantApi } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LockCommandsCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsLockCommandsCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "lock";
};

export const supportsLockCommandsCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsLockCommandsCardFeatureFromState(stateObj);
};

@customElement("hui-lock-commands-card-feature")
class HuiLockCommandsCardFeature
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

  @state() private _config?: LockCommandsCardFeatureConfig;

  static getStubConfig(): LockCommandsCardFeatureConfig {
    return {
      type: "lock-commands",
    };
  }

  public setConfig(config: LockCommandsCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _onTap(ev): void {
    ev.stopPropagation();
    const service = ev.target.dataset.service;
    if (!this._stateObj || !service) {
      return;
    }
    forwardHaptic(this, "light");
    callProtectedLockService(
      this,
      {
        callService: this._api.callService,
        callWS: this._api.callWS,
        localize: this._localize,
      },
      this._stateObj,
      service
    );
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsLockCommandsCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    return html`
      <ha-control-button-group>
        <ha-control-button
          .label=${this._localize("ui.card.lock.lock")}
          .disabled=${!canLock(this._stateObj)}
          @click=${this._onTap}
          data-service="lock"
        >
          <ha-svg-icon .path=${mdiLock}></ha-svg-icon>
        </ha-control-button>
        <ha-control-button
          .label=${this._localize("ui.card.lock.unlock")}
          .disabled=${!canUnlock(this._stateObj)}
          @click=${this._onTap}
          data-service="unlock"
        >
          <ha-svg-icon .path=${mdiLockOpenVariant}></ha-svg-icon>
        </ha-control-button>
      </ha-control-button-group>
    `;
  }

  static get styles(): CSSResultGroup {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-lock-commands-card-feature": HuiLockCommandsCardFeature;
  }
}
