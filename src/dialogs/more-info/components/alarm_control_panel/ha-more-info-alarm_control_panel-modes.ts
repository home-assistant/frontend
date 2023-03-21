import {
  mdiAirplane,
  mdiHome,
  mdiLock,
  mdiMoonWaningCrescent,
  mdiShield,
  mdiShieldOff,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeAttributeNameDisplay } from "../../../../common/entity/compute_attribute_display";
import { stateColorCss } from "../../../../common/entity/state_color";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import "../../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../../components/ha-control-select";
import "../../../../components/ha-control-slider";
import {
  AlarmControlPanelEntity,
  AlarmControlPanelEntityFeature,
} from "../../../../data/alarm_control_panel";
import { HomeAssistant } from "../../../../types";

type AlarmMode =
  | "away"
  | "home"
  | "night"
  | "vacation"
  | "custom_bypass"
  | "disarmed";

type AlarmConfig = {
  service: string;
  feature?: AlarmControlPanelEntityFeature;
  state: string;
  path: string;
};
const ALARM_MODES: Record<AlarmMode, AlarmConfig> = {
  away: {
    feature: AlarmControlPanelEntityFeature.ARM_AWAY,
    service: "alarm_arm_away",
    state: "armed_away",
    path: mdiLock,
  },
  home: {
    feature: AlarmControlPanelEntityFeature.ARM_HOME,
    service: "alarm_arm_home",
    state: "armed_home",
    path: mdiHome,
  },
  custom_bypass: {
    feature: AlarmControlPanelEntityFeature.ARM_CUSTOM_BYPASS,
    service: "alarm_arm_custom_bypass",
    state: "armed_custom_bypass",
    path: mdiShield,
  },
  night: {
    feature: AlarmControlPanelEntityFeature.ARM_NIGHT,
    service: "alarm_arm_night",
    state: "armed_night",
    path: mdiMoonWaningCrescent,
  },
  vacation: {
    feature: AlarmControlPanelEntityFeature.ARM_VACATION,
    service: "alarm_arm_vacation",
    state: "armed_vacation",
    path: mdiAirplane,
  },
  disarmed: {
    service: "alarm_disarm",
    state: "disarmed",
    path: mdiShieldOff,
  },
};

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
        this._currentMode = this._modes(this.stateObj).find(
          (mode) => ALARM_MODES[mode].state === this.stateObj.state
        );
      }
    }
  }

  private _valueChanged(ev: CustomEvent) {
    const mode = (ev.detail as any).value as AlarmMode;

    const { state: modeState, service } = ALARM_MODES[mode];

    if (modeState === this.stateObj.state) return;

    this._currentMode = mode;

    this.hass.callService("alarm_control_panel", service, {
      entity_id: this.stateObj!.entity_id,
      code: "1234",
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
        .ariaLabel=${computeAttributeNameDisplay(
          this.hass.localize,
          this.stateObj,
          this.hass.entities,
          "percentage"
        )}
        style=${styleMap({
          "--control-select-color": color,
          "--modes-count": modes.length.toString(),
        })}
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
