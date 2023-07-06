import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import "../../../components/ha-absolute-time";
import "../../../components/ha-relative-time";
import { isUnavailableState } from "../../../data/entity";
import { LightEntity } from "../../../data/light";
import { SENSOR_DEVICE_CLASS_TIMESTAMP } from "../../../data/sensor";
import "../../../panels/lovelace/components/hui-timestamp-display";
import { HomeAssistant } from "../../../types";

@customElement("ha-more-info-state-header")
export class HaMoreInfoStateHeader extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @property({ attribute: false }) public stateOverride?: string;

  @state() private _absoluteTime = false;

  private _computeStateDisplay(stateObj: HassEntity): TemplateResult | string {
    if (
      stateObj.attributes.device_class === SENSOR_DEVICE_CLASS_TIMESTAMP &&
      !isUnavailableState(stateObj.state)
    ) {
      return html`
        <hui-timestamp-display
          .hass=${this.hass}
          .ts=${new Date(stateObj.state)}
          format="relative"
          capitalize
        ></hui-timestamp-display>
      `;
    }

    const stateDisplay = computeStateDisplay(
      this.hass!.localize,
      stateObj,
      this.hass!.locale,
      this.hass!.config,
      this.hass!.entities
    );

    return stateDisplay;
  }

  private _toggleAbsolute() {
    this._absoluteTime = !this._absoluteTime;
  }

  protected render(): TemplateResult {
    const stateDisplay =
      this.stateOverride ?? this._computeStateDisplay(this.stateObj);

    return html`
      <p class="state">${stateDisplay}</p>
      <p class="last-changed" @click=${this._toggleAbsolute}>
        ${this._absoluteTime
          ? html`
              <ha-absolute-time
                .hass=${this.hass}
                .datetime=${this.stateObj.last_changed}
              ></ha-absolute-time>
            `
          : html`
              <ha-relative-time
                .hass=${this.hass}
                .datetime=${this.stateObj.last_changed}
                capitalize
              ></ha-relative-time>
            `}
      </p>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      p {
        text-align: center;
        margin: 0;
      }
      .state {
        font-style: normal;
        font-weight: 400;
        font-size: 36px;
        line-height: 44px;
      }
      .last-changed {
        font-style: normal;
        font-weight: 500;
        font-size: 16px;
        line-height: 24px;
        letter-spacing: 0.1px;
        padding: 4px 0;
        margin-bottom: 20px;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-state-header": HaMoreInfoStateHeader;
  }
}
