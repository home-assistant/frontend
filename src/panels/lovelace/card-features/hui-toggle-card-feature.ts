import {
  mdiFan,
  mdiFanOff,
  mdiLightbulbOff,
  mdiLightbulbOn,
  mdiPower,
  mdiPowerOff,
  mdiVolumeHigh,
  mdiVolumeOff,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-switch";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity";
import { forwardHaptic } from "../../../data/haptics";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type { ToggleCardFeatureConfig } from "./types";

export const supportsToggleCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return [
    "switch",
    "input_boolean",
    "light",
    "fan",
    "siren",
    "automation",
  ].includes(domain);
};

const DOMAIN_ICONS: Record<string, { on: string; off: string }> = {
  siren: {
    on: mdiVolumeHigh,
    off: mdiVolumeOff,
  },
  light: {
    on: mdiLightbulbOn,
    off: mdiLightbulbOff,
  },
  fan: {
    on: mdiFan,
    off: mdiFanOff,
  },
};

@customElement("hui-toggle-card-feature")
class HuiToggleCardFeature extends LitElement implements LovelaceCardFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: ToggleCardFeatureConfig;

  static getStubConfig(): ToggleCardFeatureConfig {
    return {
      type: "toggle",
    };
  }

  public setConfig(config: ToggleCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _valueChanged(ev) {
    const checked = ev.target.checked as boolean;

    if (checked) {
      this._turnOn();
    } else {
      this._turnOff();
    }
  }

  private _turnOn() {
    this._callService(true);
  }

  private _turnOff() {
    this._callService(false);
  }

  private async _callService(turnOn): Promise<void> {
    if (!this.hass || !this.stateObj) {
      return;
    }
    forwardHaptic("light");
    const stateDomain = computeDomain(this.stateObj.entity_id);
    const serviceDomain = stateDomain;
    const service = turnOn ? "turn_on" : "turn_off";

    await this.hass.callService(serviceDomain, service, {
      entity_id: this.stateObj.entity_id,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsToggleCardFeature(this.stateObj)
    ) {
      return nothing;
    }

    const onColor = "var(--feature-color)";
    const offColor = stateColorCss(this.stateObj, "off");

    const isOn = this.stateObj.state === "on";
    const isOff = this.stateObj.state === "off";

    const domain = computeDomain(this.stateObj.entity_id);
    const onIcon = DOMAIN_ICONS[domain]?.on || mdiPower;
    const offIcon = DOMAIN_ICONS[domain]?.off || mdiPowerOff;

    if (
      this.stateObj.attributes.assumed_state ||
      this.stateObj.state === UNKNOWN
    ) {
      return html`
        <ha-control-button-group>
          <ha-control-button
            .label=${this.hass.localize("ui.card.common.turn_off")}
            @click=${this._turnOff}
            .disabled=${this.stateObj.state === UNAVAILABLE}
            class=${classMap({
              active: isOff,
            })}
            style=${styleMap({
              "--color": offColor,
            })}
          >
            <ha-svg-icon .path=${offIcon}></ha-svg-icon>
          </ha-control-button>
          <ha-control-button
            .label=${this.hass.localize("ui.card.common.turn_on")}
            @click=${this._turnOn}
            .disabled=${this.stateObj.state === UNAVAILABLE}
            class=${classMap({
              active: isOn,
            })}
            style=${styleMap({
              "--color": onColor,
            })}
          >
            <ha-svg-icon .path=${onIcon}></ha-svg-icon>
          </ha-control-button>
        </ha-control-button-group>
      `;
    }

    return html`
      <ha-control-switch
        .pathOn=${onIcon}
        .pathOff=${offIcon}
        .checked=${isOn}
        @change=${this._valueChanged}
        .ariaLabel=${this.hass.localize("ui.card.common.toggle")}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
      </ha-control-switch>
    `;
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        ha-control-button.active {
          --control-button-icon-color: white;
          --control-button-background-color: var(--color);
          --control-button-background-opacity: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-toggle-card-feature": HuiToggleCardFeature;
  }
}
