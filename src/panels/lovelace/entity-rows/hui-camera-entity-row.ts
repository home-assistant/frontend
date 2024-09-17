import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../state-control/camera/ha-state-control-camera-motion";
import { CameraEntity, supportsMotionOnOff } from "../../../data/camera";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-camera-entity-row")
class HuiCameraEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    const stateObj = this.hass.states[this._config.entity] as CameraEntity;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const showMotionSwitch = supportsMotionOnOff(stateObj);

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        .catchInteraction=${!showMotionSwitch}
      >
        ${showMotionSwitch
          ? html`
              <ha-state-control-camera-motion
                .stateObj=${stateObj}
                .hass=${this.hass}
              ></ha-state-control-camera-motion>
              <span class="with-state">
                ${this.hass.formatEntityState(stateObj)}
              </span>
            `
          : html`
              <div class="state">${this.hass.formatEntityState(stateObj)}</div>
            `}
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .state {
        text-align: right;
      }
      .with-state {
        text-align: end;
        margin-left: 5px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-camera-entity-row": HuiCameraEntityRow;
  }
}
