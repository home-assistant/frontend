import { mdiShieldOff } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import "../../../components/ha-control-slider";
import {
  ALARM_MODES,
  AlarmControlPanelEntity,
  AlarmMode,
  supportedAlarmModes,
} from "../../../data/alarm_control_panel";
import { UNAVAILABLE } from "../../../data/entity";
import { showEnterCodeDialog } from "../../../dialogs/enter-code/show-enter-code-dialog";
import { HomeAssistant } from "../../../types";
import { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { filterModes } from "./common/filter-modes";
import { AlarmModesCardFeatureConfig } from "./types";

export const supportsAlarmModesCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "alarm_control_panel";
};

@customElement("hui-alarm-modes-card-feature")
class HuiAlarmModeCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: AlarmControlPanelEntity;

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

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentMode = this._getCurrentMode(this.stateObj);
    }
  }

  private _modes = memoizeOne(
    (
      stateObj: AlarmControlPanelEntity,
      selectedModes: AlarmMode[] | undefined
    ) => {
      if (!selectedModes) {
        return [];
      }

      return (Object.keys(ALARM_MODES) as AlarmMode[]).filter((mode) => {
        const feature = ALARM_MODES[mode].feature;
        return (
          (!feature || supportsFeature(stateObj, feature)) &&
          selectedModes.includes(mode)
        );
      });
    }
  );

  private _getCurrentMode(stateObj: AlarmControlPanelEntity) {
    return this._modes(stateObj, this._config?.modes).find(
      (mode) => mode === stateObj.state
    );
  }

  private async _valueChanged(ev: CustomEvent) {
    const mode = (ev.detail as any).value as AlarmMode;

    if (mode === this.stateObj!.state) return;

    const oldMode = this._getCurrentMode(this.stateObj!);
    this._currentMode = mode;

    try {
      await this._setMode(mode);
    } catch (err) {
      this._currentMode = oldMode;
    }
  }

  private async _disarm() {
    this._setMode("disarmed");
  }

  private async _setMode(mode: AlarmMode) {
    const { service } = ALARM_MODES[mode];

    let code: string | undefined;

    if (
      (mode !== "disarmed" &&
        this.stateObj!.attributes.code_arm_required &&
        this.stateObj!.attributes.code_format) ||
      (mode === "disarmed" && this.stateObj!.attributes.code_format)
    ) {
      const disarm = mode === "disarmed";

      const response = await showEnterCodeDialog(this, {
        codeFormat: this.stateObj!.attributes.code_format,
        title: this.hass!.localize(
          `ui.card.alarm_control_panel.${disarm ? "disarm" : "arm"}`
        ),
        submitText: this.hass!.localize(
          `ui.card.alarm_control_panel.${disarm ? "disarm" : "arm"}`
        ),
      });
      if (response == null) {
        throw new Error("cancel");
      }
      code = response;
    }

    await this.hass!.callService("alarm_control_panel", service, {
      entity_id: this.stateObj!.entity_id,
      code,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsAlarmModesCardFeature(this.stateObj)
    ) {
      return null;
    }

    const color = stateColorCss(this.stateObj);

    const supportedModes = supportedAlarmModes(this.stateObj);

    const options = filterModes(
      supportedModes,
      this._config.modes
    ).map<ControlSelectOption>((mode) => ({
      value: mode,
      label: this.hass!.localize(`ui.card.alarm_control_panel.modes.${mode}`),
      path: ALARM_MODES[mode].path,
    }));

    if (["triggered", "arming", "pending"].includes(this.stateObj.state)) {
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
      <div class="container">
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
          .disabled=${this.stateObj!.state === UNAVAILABLE}
        >
        </ha-control-select>
      </div>
    `;
  }

  static get styles() {
    return css`
      ha-control-select {
        --control-select-color: var(--feature-color);
        --control-select-padding: 0;
        --control-select-thickness: 40px;
        --control-select-border-radius: 10px;
        --control-select-button-border-radius: 10px;
      }
      ha-control-button-group {
        margin: 0 12px 12px 12px;
        --control-button-group-spacing: 12px;
      }
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alarm-modes-card-feature": HuiAlarmModeCardFeature;
  }
}
