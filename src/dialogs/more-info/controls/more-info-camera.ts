import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import "../../../components/ha-camera-stream";
import "../../../state-control/camera/ha-state-control-camera-motion";
import { CameraEntity, supportsMotionOnOff } from "../../../data/camera";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-state-header";

class MoreInfoCamera extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: CameraEntity;

  @state() private _attached = false;

  public connectedCallback() {
    super.connectedCallback();
    this._attached = true;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._attached = false;
  }

  protected render() {
    if (!this._attached || !this.hass || !this.stateObj) {
      return nothing;
    }

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
      ></ha-more-info-state-header>
      <div class="controls">
        ${!supportsMotionOnOff(this.stateObj)
          ? ``
          : html`
              <div class="motion-control">
                <div class="name">Motion detection</div>
                <div class="motion-switch">
                  <ha-state-control-camera-motion
                    .stateObj=${this.stateObj}
                    .hass=${this.hass}
                  ></ha-state-control-camera-motion>
                </div>
              </div>
            `}
        <div>
          <ha-camera-stream
            .hass=${this.hass}
            .stateObj=${this.stateObj}
            allow-exoplayer
            controls
          ></ha-camera-stream>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }

      .motion-control {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin: 10px;
      }
      .name {
        display: inline-block;
        color: var(--primary-text-color);
        white-space: nowrap;
        text-overflow: ellipsis;
        font-style: normal;
        font-weight: 500;
        font-size: 16px;
        line-height: 24px;
        letter-spacing: 0.1px;
        margin-right: 10px;
      }
      .motion-switch {
        width: 100%;
      }
    `;
  }
}

customElements.define("more-info-camera", MoreInfoCamera);

declare global {
  interface HTMLElementTagNameMap {
    "more-info-camera": MoreInfoCamera;
  }
}
