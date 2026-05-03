import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-absolute-time";
import "../../../components/ha-relative-time";
import type { LightEntity } from "../../../data/light";
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
    return this.hass.formatEntityState(this.stateObj);
  }

  private _toggleAbsolute() {
    this._absoluteTime = !this._absoluteTime;
  }

  protected render(): TemplateResult {
    const stateDisplay = this.stateOverride ?? this._localizeState();

    return html`
      <p class="state">${stateDisplay}</p>
      <div class="time-row">
        <p class="last-changed" @click=${this._toggleAbsolute}>
          ${this._absoluteTime
            ? html`
                <ha-absolute-time
                  .hass=${this.hass}
                  .datetime=${this.changedOverride ??
                  this.stateObj.last_changed}
                ></ha-absolute-time>
              `
            : html`
                <ha-relative-time
                  .hass=${this.hass}
                  .datetime=${this.changedOverride ??
                  this.stateObj.last_changed}
                  capitalize
                ></ha-relative-time>
              `}
        </p>
        <slot name="after-time"></slot>
      </div>
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
    .time-row {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--ha-space-5);
    }
    ::slotted([slot="after-time"]) {
      position: absolute;
      inset-inline-end: 0;
      top: 50%;
      transform: translateY(-50%);
    }
    .last-changed {
      font-style: normal;
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-normal);
      letter-spacing: 0.1px;
      padding: var(--ha-space-1) 0;
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
