import { html, LitElement, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../../types";
import "../../components/ha-time-picker";
import "../../components/ha-card";
import "../../components/ha-button";
import "../../components/ha-alert";
import "../../components/ha-selector/ha-selector";

@customElement("developer-tools-time-picker")
export class DeveloperToolsTimePicker extends LitElement {
  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow = false;

  @state()
  private _timeValue = "14:15:00";

  @state()
  private _timeValue2 = "09:05:05";

  static get styles() {
    return css`
      :host {
        display: block;
        padding: 16px;
        max-width: 800px;
        margin: 0 auto;
      }

      .header {
        margin-bottom: 24px;
      }

      .header h1 {
        margin: 0 0 8px 0;
        color: var(--primary-text-color);
        font-size: 28px;
        font-weight: 400;
      }

      .header p {
        margin: 0;
        color: var(--secondary-text-color);
        font-size: 16px;
        line-height: 1.5;
      }

      .section {
        margin-bottom: 32px;
      }

      .section h2 {
        margin: 0 0 16px 0;
        color: var(--primary-text-color);
        font-size: 20px;
        font-weight: 500;
      }

      .example {
        background: var(--card-background-color);
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 16px;
        border: 1px solid var(--divider-color);
      }

      .example h3 {
        margin: 0 0 16px 0;
        color: var(--primary-text-color);
        font-size: 16px;
        font-weight: 500;
      }

      .time-picker-container {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
      }

      .value-display {
        background: var(--secondary-background-color);
        padding: 8px 12px;
        border-radius: 6px;
        font-family: monospace;
        font-size: 14px;
        color: var(--primary-text-color);
        min-width: 100px;
        text-align: center;
      }

      .controls {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }

      .form-toggle {
        margin-top: 16px;
      }

      @media (max-width: 600px) {
        :host {
          padding: 12px;
        }

        .time-picker-container {
          flex-direction: column;
          align-items: stretch;
        }

        .controls {
          flex-direction: column;
          align-items: stretch;
        }
      }
    `;
  }

  protected render() {
    return html`
      <div class="header">
        <h1>Time picker demo</h1>
        <p>
          This page demonstrates the ha-time-picker component with various
          configurations and use cases.
        </p>
      </div>

      <div class="section">
        <h2>Time picker</h2>
        <div class="example">
          <div class="time-picker-container">
            <ha-time-picker
              .locale=${this.hass.locale}
              .value=${this._timeValue}
              @value-changed=${this._onTimeChanged}
            ></ha-time-picker>
            <div class="value-display">${this._timeValue}</div>
          </div>
          <p>Current value: ${this._timeValue}</p>
        </div>
      </div>

      <div class="section">
        <h2>Time picker with seconds</h2>
        <div class="example">
          <div class="time-picker-container">
            <ha-time-picker
              .locale=${this.hass.locale}
              .value=${this._timeValue2}
              .enableSeconds=${true}
              @value-changed=${this._onTime2Changed}
            ></ha-time-picker>
            <div class="value-display">${this._timeValue2}</div>
          </div>
          <p>Current value: ${this._timeValue2}</p>
        </div>
      </div>
    `;
  }

  private _onTimeChanged(ev: CustomEvent) {
    this._timeValue = ev.detail.value;
  }

  private _onTime2Changed(ev: CustomEvent) {
    this._timeValue2 = ev.detail.value;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-time-picker": DeveloperToolsTimePicker;
  }
}
