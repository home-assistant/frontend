import { mdiDoorOpen, mdiLock, mdiLockOpen } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";

import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import {
  LockEntityFeature,
  callProtectedLockService,
  isAvailable,
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

  private _onToggleTap(ev): void {
    ev.stopPropagation();
    if (!this.hass || !this.stateObj) {
      return;
    }
    forwardHaptic("light");
    callProtectedLockService(
      this,
      this.hass,
      this.stateObj,
      this.stateObj.state === "locked" ? "unlock" : "lock"
    );
  }

  private _onOpenTap(ev): void {
    ev.stopPropagation();
    if (!this.hass || !this.stateObj) {
      return;
    }
    forwardHaptic("light");
    callProtectedLockService(this, this.hass, this.stateObj, "open");
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
    const isLocked = this.stateObj.state === "locked";

    return html`
      <ha-control-button-group>
        <ha-control-button
          .label=${isLocked
            ? this.hass.localize("ui.card.lock.unlock")
            : this.hass.localize("ui.card.lock.lock")}
          @click=${this._onToggleTap}
          .disabled=${!isAvailable(this.stateObj)}
        >
          <ha-svg-icon .path=${isLocked ? mdiLockOpen : mdiLock}></ha-svg-icon>
        </ha-control-button>
        <ha-control-button
          .label=${this.hass.localize("ui.card.lock.unlock")}
          @click=${this._onOpenTap}
          .disabled=${!isAvailable(this.stateObj)}
        >
          <ha-svg-icon .path=${mdiDoorOpen}></ha-svg-icon>
        </ha-control-button>
      </ha-control-button-group>
    `;
  }

  static get styles() {
    return css`
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
