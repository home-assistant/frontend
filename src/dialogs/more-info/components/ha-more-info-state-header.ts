import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-absolute-time";
import "../../../components/ha-relative-time";
import { isUnavailableState } from "../../../data/entity";
import type { LightEntity } from "../../../data/light";
import { SENSOR_DEVICE_CLASS_TIMESTAMP } from "../../../data/sensor";
import "../../../panels/lovelace/components/hui-timestamp-display";
import type { HomeAssistant } from "../../../types";

@customElement("ha-more-info-state-header")
export class HaMoreInfoStateHeader extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @property({ attribute: false }) public stateOverride?: string;

  @property({ attribute: false }) public changedOverride?: number;

  @state() private _absoluteTime = false;

  private _localizeState(): TemplateResult | string {
    if (
      this.stateObj.attributes.device_class === SENSOR_DEVICE_CLASS_TIMESTAMP &&
      !isUnavailableState(this.stateObj.state)
    ) {
      return html`
        <hui-timestamp-display
          .hass=${this.hass}
          .ts=${new Date(this.stateObj.state)}
          format="relative"
          capitalize
        ></hui-timestamp-display>
      `;
    }

    return this.hass.formatEntityState(this.stateObj);
  }

  private _toggleAbsolute() {
    this._absoluteTime = !this._absoluteTime;
  }

  protected render(): TemplateResult {
    const stateDisplay = this.stateOverride ?? this._localizeState();

    return html`
      <p class="state">${stateDisplay}</p>
      <p class="last-changed" @click=${this._toggleAbsolute}>
        ${this._absoluteTime
          ? html`
              <ha-absolute-time
                .hass=${this.hass}
                .datetime=${this.changedOverride ?? this.stateObj.last_changed}
              ></ha-absolute-time>
            `
          : html`
              <ha-relative-time
                .hass=${this.hass}
                .datetime=${this.changedOverride ?? this.stateObj.last_changed}
                capitalize
              ></ha-relative-time>
            `}
      </p>
    `;
  }

  static styles = css`
    p {
      text-align: center;
      margin: 0;
    }
    .state {
      font-style: normal;
      font-weight: var(--ha-font-weight-normal);
      font-size: 36px;
      line-height: var(--ha-line-height-condensed);
    }
    .last-changed {
      font-style: normal;
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-normal);
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-state-header": HaMoreInfoStateHeader;
  }
}
