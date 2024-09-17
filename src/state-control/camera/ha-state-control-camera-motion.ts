import { mdiMotionSensor, mdiMotionSensorOff } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../components/ha-control-button";
import "../../components/ha-control-switch";
import "../../components/ha-state-icon";
import { CameraEntity } from "../../data/camera";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { forwardHaptic } from "../../data/haptics";
import { HomeAssistant } from "../../types";

@customElement("ha-state-control-camera-motion")
export class HaStateControlCameraMotion extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: CameraEntity;

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

    await this.hass.callService(
      "camera",
      turnOn ? "enable_motion_detection" : "disable_motion_detection",
      {
        entity_id: this.stateObj.entity_id,
      }
    );
  }

  protected render(): TemplateResult {
    const isOn = this.stateObj.attributes.motion_detection === true;
    return html`
      <ha-control-switch
        touch-action="none"
        horizontal
        .checked=${isOn}
        @change=${this._valueChanged}
        .pathOn=${mdiMotionSensor}
        .pathOff=${mdiMotionSensorOff}
        .ariaLabel=${isOn
          ? this.hass.localize("ui.card.camera.enable_motion_detection")
          : this.hass.localize("ui.card.camera.disable_motion_detection")}
        .disabled=${this.stateObj.state === UNAVAILABLE ||
        this.stateObj.state === UNKNOWN}
      ></ha-control-switch>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-control-switch {
        height: 32px;
        min-width: 64px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-camera-motion": HaStateControlCameraMotion;
  }
}
