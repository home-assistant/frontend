import { mdiShieldOff } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import "../../../components/ha-control-slider";
import type {
  AlarmControlPanelEntity,
  AlarmMode,
} from "../../../data/alarm_control_panel";
import {
  ALARM_MODES,
  setProtectedAlarmControlPanelMode,
  supportedAlarmModes,
} from "../../../data/alarm_control_panel";
import { UNAVAILABLE } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import { filterModes } from "./common/filter-modes";
import type {
  AlarmModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsAlarmModesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "alarm_control_panel";
};

@customElement("hui-alarm-modes-card-feature")
class HuiAlarmModeCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public context!: LovelaceCardFeatureContext;

  @state() private _config?: AlarmModesCardFeatureConfig;

  @state() _currentMode?: AlarmMode;

  static getStubConfig(): AlarmModesCardFeatureConfig {
    return {
      type: "alarm-modes",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import(
      "../editor/config-elements/hui-alarm-modes-card-feature-editor"
    );
    return document.createElement("hui-alarm-modes-card-feature-editor");
  }

  public setConfig(config: AlarmModesCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private get _stateObj(): AlarmControlPanelEntity | undefined {
    return this.hass.states[this.context.entity_id!] as
      | AlarmControlPanelEntity
      | undefined;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("hass") && this._stateObj) {
      const oldHass = changedProp.get("hass") as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states[this.context.entity_id!];
      if (oldStateObj !== this._stateObj) {
        this._currentMode = this._getCurrentMode(this._stateObj);
      }
    }
  }

  private _getCurrentMode = memoizeOne((stateObj: AlarmControlPanelEntity) => {
    const supportedModes = supportedAlarmModes(stateObj);
    return supportedModes.find((mode) => mode === stateObj.state);
  });

  private async _valueChanged(ev: CustomEvent) {
    if (!this._stateObj) return;
    const mode = (ev.detail as any).value as AlarmMode;

    if (mode === this._stateObj.state) return;

    const oldMode = this._getCurrentMode(this._stateObj);
    this._currentMode = mode;

    try {
      await this._setMode(mode);
    } catch (_err) {
      this._currentMode = oldMode;
    }
  }

  private async _disarm() {
    this._setMode("disarmed");
  }

  private async _setMode(mode: AlarmMode) {
    await setProtectedAlarmControlPanelMode(
      this,
      this.hass!,
      this._stateObj!,
      mode
    );
  }

  protected render(): TemplateResult | typeof nothing {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsAlarmModesCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const color = stateColorCss(this._stateObj);

    const supportedModes = supportedAlarmModes(this._stateObj).reverse();

    const options = filterModes(
      supportedModes,
      this._config.modes
    ).map<ControlSelectOption>((mode) => ({
      value: mode,
      label: this.hass!.localize(`ui.card.alarm_control_panel.modes.${mode}`),
      path: ALARM_MODES[mode].path,
    }));

    if (["triggered", "arming", "pending"].includes(this._stateObj.state)) {
      return html`
        <ha-control-button-group>
          <ha-control-button
            .label=${this.hass.localize("ui.card.alarm_control_panel.disarm")}
            @click=${this._disarm}
          >
            <ha-svg-icon .path=${mdiShieldOff}></ha-svg-icon>
          </ha-control-button>
        </ha-control-button-group>
      `;
    }

    return html`
      <ha-control-select
        .options=${options}
        .value=${this._currentMode}
        @value-changed=${this._valueChanged}
        hide-label
        .ariaLabel=${this.hass.localize(
          "ui.card.alarm_control_panel.modes_label"
        )}
        style=${styleMap({
          "--control-select-color": color,
          "--modes-count": options.length.toString(),
        })}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
      >
      </ha-control-select>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alarm-modes-card-feature": HuiAlarmModeCardFeature;
  }
}
