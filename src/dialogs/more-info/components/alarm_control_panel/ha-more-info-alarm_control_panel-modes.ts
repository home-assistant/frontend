import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { stateColorCss } from "../../../../common/entity/state_color";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import "../../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../../components/ha-control-select";
import "../../../../components/ha-control-slider";
import {
  AlarmControlPanelEntity,
  AlarmMode,
  ALARM_MODES,
} from "../../../../data/alarm_control_panel";
import { UNAVAILABLE } from "../../../../data/entity";
import { HomeAssistant } from "../../../../types";
import { showEnterCodeDialogDialog } from "./show-enter-code-dialog";

@customElement("ha-more-info-alarm_control_panel-modes")
export class HaMoreInfoAlarmControlPanelModes extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: AlarmControlPanelEntity;

  @state() _currentMode?: AlarmMode;

  private _modes = memoizeOne((stateObj: AlarmControlPanelEntity) => {
    const modes = Object.keys(ALARM_MODES) as AlarmMode[];
    return modes.filter((mode) => {
      const feature = ALARM_MODES[mode as AlarmMode].feature;
      return !feature || supportsFeature(stateObj, feature);
    });
  });

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    super.updated(changedProp);
    if (changedProp.has("stateObj") && this.stateObj) {
      const oldStateObj = changedProp.get("stateObj") as HassEntity | undefined;

      if (!oldStateObj || this.stateObj.state !== oldStateObj.state) {
        this._currentMode = this._getCurrentMode(this.stateObj);
      }
    }
  }

  private _getCurrentMode(stateObj: AlarmControlPanelEntity) {
    return this._modes(stateObj).find(
      (mode) => ALARM_MODES[mode].state === stateObj.state
    );
  }

  private async _valueChanged(ev: CustomEvent) {
    const mode = (ev.detail as any).value as AlarmMode;

    const { state: modeState, service } = ALARM_MODES[mode];

    if (modeState === this.stateObj.state) return;

    // Force ha-control-select to previous mode because we don't known if the service call will succeed due to code check
    this._currentMode = mode;
    await this.requestUpdate("_currentMode");
    this._currentMode = this._getCurrentMode(this.stateObj!);

    let code: string | undefined;

    if (
      (mode !== "disarmed" &&
        this.stateObj.attributes.code_arm_required &&
        this.stateObj.attributes.code_format) ||
      (mode === "disarmed" && this.stateObj.attributes.code_format)
    ) {
      const disarm = mode === "disarmed";

      const response = await showEnterCodeDialogDialog(this, {
        codeFormat: this.stateObj.attributes.code_format,
        title: this.hass.localize(
          `ui.dialogs.more_info_control.alarm_control_panel.${
            disarm ? "disarm_title" : "arm_title"
          }`
        ),
        submitText: this.hass.localize(
          `ui.dialogs.more_info_control.alarm_control_panel.${
            disarm ? "disarm_action" : "arm_action"
          }`
        ),
      });
      if (!response) {
        return;
      }
      code = response;
    }

    await this.hass.callService("alarm_control_panel", service, {
      entity_id: this.stateObj!.entity_id,
      code,
    });
  }

  protected render() {
    const color = stateColorCss(this.stateObj);

    const modes = this._modes(this.stateObj);

    const options = modes.map<ControlSelectOption>((mode) => ({
      value: mode,
      label: this.hass.localize(
        `ui.dialogs.more_info_control.alarm_control_panel.modes.${mode}`
      ),
      path: ALARM_MODES[mode].path,
    }));

    return html`
      <ha-control-select
        vertical
        .options=${options}
        .value=${this._currentMode}
        @value-changed=${this._valueChanged}
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
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-control-select {
        height: 45vh;
        max-height: max(320px, var(--modes-count, 1) * 80px);
        min-height: max(200px, var(--modes-count, 1) * 80px);
        --control-select-thickness: 100px;
        --control-select-border-radius: 24px;
        --control-select-color: var(--primary-color);
        --control-select-background: var(--disabled-color);
        --control-select-background-opacity: 0.2;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-alarm_control_panel-modes": HaMoreInfoAlarmControlPanelModes;
  }
}
