import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/state-info";
import "../components/entity/ha-entity-toggle";
import { CameraEntity, supportsMotionOnOff } from "../data/camera";
import "../state-control/camera/ha-state-control-camera-motion";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";

@customElement("state-card-camera")
class StateCardCamera extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: CameraEntity;

  @property({ type: Boolean }) public inDialog = false;

  protected render(): TemplateResult {
    const showMotionSwitch = supportsMotionOnOff(this.stateObj);

    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        ${showMotionSwitch
          ? html`
              <ha-state-control-camera-motion
                .stateObj=${this.stateObj}
                .hass=${this.hass}
              ></ha-state-control-camera-motion>
              <span class="with-state">
                ${this.hass.formatEntityState(this.stateObj)}
              </span>
            `
          : html`
              <div class="state">
                ${this.hass.formatEntityState(this.stateObj)}
              </div>
            `}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          line-height: 1.5;
        }
        .state {
          text-align: right;
        }
        .with-state {
          text-align: end;
          margin-left: 5px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-camera": StateCardCamera;
  }
}
