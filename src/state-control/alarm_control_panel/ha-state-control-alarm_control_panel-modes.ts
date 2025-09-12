import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { stateColor } from "../../common/entity/state_color";
import { supportsFeature } from "../../common/entity/supports-feature";
import "../../components/ha-control-select";
import type { ControlSelectOption } from "../../components/ha-control-select";
import "../../components/ha-control-slider";
import type {
  AlarmControlPanelEntity,
  AlarmMode,
} from "../../data/alarm_control_panel";
import {
  ALARM_MODES,
  setProtectedAlarmControlPanelMode,
} from "../../data/alarm_control_panel";
import { UNAVAILABLE } from "../../data/entity";
import type { HomeAssistant } from "../../types";

@customElement("ha-state-control-alarm_control_panel-modes")
export class HaStateControlAlarmControlPanelModes extends LitElement {
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

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj")) {
      this._currentMode = this._getCurrentMode(this.stateObj);
    }
  }

  private _getCurrentMode(stateObj: AlarmControlPanelEntity) {
    return this._modes(stateObj).find((mode) => mode === stateObj.state);
  }

  private async _setMode(mode: AlarmMode) {
    await setProtectedAlarmControlPanelMode(
      this,
      this.hass!,
      this.stateObj!,
      mode
    );
  }

  private async _valueChanged(ev: CustomEvent) {
    const mode = (ev.detail as any).value as AlarmMode;

    if (mode === this.stateObj!.state) return;

    const oldMode = this._getCurrentMode(this.stateObj!);
    this._currentMode = mode;

    try {
      await this._setMode(mode);
    } catch (_err) {
      this._currentMode = oldMode;
    }
  }

  protected render() {
    const color = stateColor(this, this.stateObj);

    const modes = this._modes(this.stateObj);

    const options = modes.map<ControlSelectOption>((mode) => ({
      value: mode,
      label: this.hass.localize(`ui.card.alarm_control_panel.modes.${mode}`),
      path: ALARM_MODES[mode].path,
    }));

    return html`
      <ha-control-select
        vertical
        .options=${options}
        .value=${this._currentMode}
        @value-changed=${this._valueChanged}
        .label=${this.hass.localize("ui.card.alarm_control_panel.modes_label")}
        style=${styleMap({
          "--control-select-color": color,
          "--modes-count": modes.length.toString(),
        })}
        .disabled=${this.stateObj!.state === UNAVAILABLE}
      >
      </ha-control-select>
    `;
  }

  static styles = css`
    ha-control-select {
      height: 45vh;
      max-height: max(320px, var(--modes-count, 1) * 80px);
      min-height: max(200px, var(--modes-count, 1) * 80px);
      --control-select-thickness: 130px;
      --control-select-border-radius: 36px;
      --control-select-color: var(--primary-color);
      --control-select-background: var(--disabled-color);
      --control-select-background-opacity: 0.2;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-alarm_control_panel-modes": HaStateControlAlarmControlPanelModes;
  }
}
