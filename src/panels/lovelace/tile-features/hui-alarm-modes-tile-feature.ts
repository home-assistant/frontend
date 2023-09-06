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
  AlarmControlPanelEntity,
  AlarmMode,
  ALARM_MODES,
} from "../../../data/alarm_control_panel";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature, LovelaceTileFeatureEditor } from "../types";
import { AlarmModesTileFeatureConfig } from "./types";
import { showEnterCodeDialogDialog } from "../../../dialogs/enter-code/show-enter-code-dialog";

export const supportsAlarmModesTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "alarm_control_panel";
};

@customElement("hui-alarm-modes-tile-feature")
class HuiAlarmModeTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: AlarmControlPanelEntity;

  @state() private _config?: AlarmModesTileFeatureConfig;

  @state() _currentMode?: AlarmMode;

  static getStubConfig(_, stateObj?: HassEntity): AlarmModesTileFeatureConfig {
    return {
      type: "alarm-modes",
      modes: stateObj
        ? (Object.keys(ALARM_MODES) as AlarmMode[]).filter((mode) => {
            const feature = ALARM_MODES[mode as AlarmMode].feature;
            return !feature || supportsFeature(stateObj, feature);
          })
        : [],
    };
  }

  public static async getConfigElement(): Promise<LovelaceTileFeatureEditor> {
    await import(
      "../editor/config-elements/hui-alarm-modes-tile-feature-editor"
    );
    return document.createElement("hui-alarm-modes-tile-feature-editor");
  }

  public setConfig(config: AlarmModesTileFeatureConfig): void {
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

      const response = await showEnterCodeDialogDialog(this, {
        codeFormat: this.stateObj!.attributes.code_format,
        title: this.hass!.localize(
          `ui.dialogs.more_info_control.alarm_control_panel.${
            disarm ? "disarm_title" : "arm_title"
          }`
        ),
        submitText: this.hass!.localize(
          `ui.dialogs.more_info_control.alarm_control_panel.${
            disarm ? "disarm_action" : "arm_action"
          }`
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
      !supportsAlarmModesTileFeature(this.stateObj)
    ) {
      return null;
    }

    const color = stateColorCss(this.stateObj);

    const modes = this._modes(this.stateObj, this._config.modes);

    const options = modes.map<ControlSelectOption>((mode) => ({
      value: mode,
      label: this.hass!.localize(
        `ui.dialogs.more_info_control.alarm_control_panel.modes.${mode}`
      ),
      path: ALARM_MODES[mode].path,
    }));

    if (["triggered", "arming", "pending"].includes(this.stateObj.state)) {
      return html`
        <ha-control-button-group>
          <ha-control-button
            .label=${this.hass.localize(
              "ui.dialogs.more_info_control.alarm_control_panel.disarm_action"
            )}
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
            "ui.dialogs.more_info_control.alarm_control_panel.modes_label"
          )}
          style=${styleMap({
            "--control-select-color": color,
            "--modes-count": modes.length.toString(),
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
        --control-select-color: var(--tile-color);
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
    "hui-alarm-modes-tile-feature": HuiAlarmModeTileFeature;
  }
}
