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
import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateColorCss } from "../../../common/entity/state_color";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-switch";
import type { HaControlSwitch } from "../../../components/ha-control-switch";
import { apiContext } from "../../../data/context";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity/entity";
import { forwardHaptic } from "../../../data/haptics";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant, HomeAssistantApi } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  ToggleCardFeatureConfig,
} from "./types";

const supportsToggleCardFeatureFromState = (stateObj: HassEntity) => {
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

export const supportsToggleCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsToggleCardFeatureFromState(stateObj);
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
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: HassEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _config?: ToggleCardFeatureConfig;

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-toggle-card-feature-editor");
    return document.createElement("hui-toggle-card-feature-editor");
  }

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

  private async _valueChanged(ev) {
    const control = ev.target as HaControlSwitch;
    const checked = control.checked;

    const confirmed = checked ? await this._turnOn() : await this._turnOff();

    if (!confirmed) {
      control.checked = this._stateObj?.state === "on";
    }
  }

  private _turnOn() {
    return this._callService(true);
  }

  private _turnOff() {
    return this._callService(false);
  }

  private async _callService(turnOn): Promise<boolean> {
    if (!this._stateObj) {
      return false;
    }

    if (
      turnOn ? this._config?.confirm_turn_on : this._config?.confirm_turn_off
    ) {
      const confirmed = await showConfirmationDialog(this, {
        text: this._localize(
          turnOn
            ? "ui.card.common.confirm_turn_on"
            : "ui.card.common.confirm_turn_off",
          { entity: computeStateName(this._stateObj) }
        ),
      });
      if (!confirmed) {
        return false;
      }
    }

    forwardHaptic(this, "light");
    const stateDomain = computeDomain(this._stateObj.entity_id);
    const serviceDomain = stateDomain;
    const service = turnOn ? "turn_on" : "turn_off";

    await this._api.callService(serviceDomain, service, {
      entity_id: this._stateObj.entity_id,
    });
    return true;
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsToggleCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    const onColor = "var(--feature-color)";
    const offColor = stateColorCss(this._stateObj, "off");

    const isOn = this._stateObj.state === "on";
    const isOff = this._stateObj.state === "off";

    const domain = computeDomain(this._stateObj.entity_id);
    const onIcon = DOMAIN_ICONS[domain]?.on || mdiPower;
    const offIcon = DOMAIN_ICONS[domain]?.off || mdiPowerOff;

    if (
      this._stateObj.attributes.assumed_state ||
      this._stateObj.state === UNKNOWN
    ) {
      return html`
        <ha-control-button-group>
          <ha-control-button
            .label=${this._localize("ui.card.common.turn_off")}
            @click=${this._turnOff}
            .disabled=${this._stateObj.state === UNAVAILABLE}
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
            .label=${this._localize("ui.card.common.turn_on")}
            @click=${this._turnOn}
            .disabled=${this._stateObj.state === UNAVAILABLE}
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
        .label=${this._localize("ui.card.common.toggle")}
        .disabled=${this._stateObj.state === UNAVAILABLE}
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
