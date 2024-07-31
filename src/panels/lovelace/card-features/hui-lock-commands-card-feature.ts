import { mdiLock, mdiLockOpenVariant } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { CSSResultGroup, LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";

import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import { forwardHaptic } from "../../../data/haptics";
import {
  callProtectedLockService,
  canLock,
  canUnlock,
} from "../../../data/lock";
import { HomeAssistant } from "../../../types";
import { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import { LockCommandsCardFeatureConfig } from "./types";

export const supportsLockCommandsCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "lock";
};

@customElement("hui-lock-commands-card-feature")
class HuiLockCommandsCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

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
    if (!this.hass || !this.stateObj || !service) {
      return;
    }
    forwardHaptic("light");
    callProtectedLockService(this, this.hass, this.stateObj, service);
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsLockCommandsCardFeature(this.stateObj)
    ) {
      return nothing;
    }

    return html`
      <ha-control-button-group>
        <ha-control-button
          .label=${this.hass.localize("ui.card.lock.lock")}
          .disabled=${!canLock(this.stateObj)}
          @click=${this._onTap}
          data-service="lock"
        >
          <ha-svg-icon .path=${mdiLock}></ha-svg-icon>
        </ha-control-button>
        <ha-control-button
          .label=${this.hass.localize("ui.card.lock.unlock")}
          .disabled=${!canUnlock(this.stateObj)}
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
