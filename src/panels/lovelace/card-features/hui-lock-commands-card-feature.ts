import { mdiDoorOpen, mdiLock, mdiLockOpen } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { computeDomain } from "../../../common/entity/compute_domain";

import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import {
  LockEntityFeature,
  callProtectedLockService,
  isAvailable,
  isLocking,
  isUnlocking,
  isLocked,
} from "../../../data/lock";
import { HomeAssistant } from "../../../types";
import { LovelaceCardFeature } from "../types";
import { LockCommandsCardFeatureConfig } from "./types";
import { forwardHaptic } from "../../../data/haptics";

export const supportsLockCommandsCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "lock" && supportsFeature(stateObj, LockEntityFeature.OPEN);
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
          .label=${isLocked(this.stateObj)
            ? this.hass.localize("ui.card.lock.unlock")
            : this.hass.localize("ui.card.lock.lock")}
          .disabled=${!isAvailable(this.stateObj)}
          @click=${this._onTap}
          data-service=${isLocked(this.stateObj) ? "unlock" : "lock"}
          class=${classMap({
            pulse: isLocking(this.stateObj) || isUnlocking(this.stateObj),
          })}
        >
          <ha-svg-icon .path=${isLocked(this.stateObj) ? mdiLockOpen : mdiLock}>
          </ha-svg-icon>
        </ha-control-button>
        <ha-control-button
          .label=${this.hass.localize("ui.card.lock.open")}
          .disabled=${!isAvailable(this.stateObj)}
          @click=${this._onTap}
          data-service="open"
        >
          <ha-svg-icon .path=${mdiDoorOpen}></ha-svg-icon>
        </ha-control-button>
      </ha-control-button-group>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      @keyframes pulse {
        0% {
          opacity: 1;
        }
        50% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      .pulse {
        animation: pulse 1s infinite;
      }
      ha-control-button-group {
        margin: 0 12px 12px 12px;
        --control-button-group-spacing: 12px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-lock-commands-card-feature": HuiLockCommandsCardFeature;
  }
}
