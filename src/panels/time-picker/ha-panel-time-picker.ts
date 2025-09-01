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
  private _timeValue = "14:30:00";

  @state()
  private _timeValue2 = "09:15";

  @state()
  private _timeValue3 = "16:45:30";

  @state()
  private _enableSeconds = true;

  @state()
  private _selectorTime = "12:00";

  @state()
  private _selectorTimeWithSeconds = "12:00:00";

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
        <h2>Basic time picker</h2>
        <div class="example">
          <h3>Default time picker (24-hour format)</h3>
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
          <h3>Time picker with seconds enabled</h3>
          <div class="time-picker-container">
            <ha-time-picker
              .locale=${this.hass.locale}
              .value=${this._timeValue3}
              .enableSeconds=${true}
              @value-changed=${this._onTime3Changed}
            ></ha-time-picker>
            <div class="value-display">${this._timeValue3}</div>
          </div>
          <p>Current value: ${this._timeValue3}</p>
        </div>
      </div>

      <div class="section">
        <h2>AM/PM time picker</h2>
        <div class="example">
          <h3>12-hour format with AM/PM (locale dependent)</h3>
          <div class="time-picker-container">
            <ha-time-picker
              .locale=${this.hass.locale}
              .value=${this._timeValue2}
              @value-changed=${this._onTime2Changed}
            ></ha-time-picker>
            <div class="value-display">${this._timeValue2}</div>
          </div>
          <p>Current value: ${this._timeValue2}</p>
          <p>
            <small>
              Note: AM/PM format is automatically enabled for locales that use
              12-hour time format (like en-US).
            </small>
          </p>
        </div>
      </div>

      <div class="section">
        <h2>Interactive controls</h2>
        <div class="example">
          <h3>Toggle seconds and reset values</h3>
          <div class="controls">
            <ha-button @click=${this._toggleSeconds} appearance="outlined">
              ${this._enableSeconds ? "Disable" : "Enable"} seconds
            </ha-button>
            <ha-button @click=${this._resetValues} appearance="outlined">
              Reset all values
            </ha-button>
            <ha-button @click=${this._setRandomTime} appearance="outlined">
              Set random time
            </ha-button>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Selector integration</h2>
        <div class="example">
          <h3>Time selector with ha-selector</h3>
          <div class="time-picker-container">
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                time: {},
              }}
              .value=${this._selectorTime}
              @value-changed=${this._onSelectorTimeChanged}
            ></ha-selector>
            <div class="value-display">${this._selectorTime}</div>
          </div>
          <p>Current value: ${this._selectorTime}</p>
        </div>

        <div class="example">
          <h3>Time selector with seconds enabled</h3>
          <div class="time-picker-container">
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                time: {
                  no_second: false,
                },
              }}
              .value=${this._selectorTimeWithSeconds}
              @value-changed=${this._onSelectorTimeWithSecondsChanged}
            ></ha-selector>
            <div class="value-display">${this._selectorTimeWithSeconds}</div>
          </div>
          <p>Current value: ${this._selectorTimeWithSeconds}</p>
        </div>
      </div>

      <div class="section">
        <h2>Usage examples</h2>
        <div class="example">
          <h3>Common use cases</h3>
          <ha-alert alert-type="info">
            The time picker component is useful for:
          </ha-alert>
          <ul style="margin: 16px 0; padding-left: 24px;">
            <li>Setting automation schedules</li>
            <li>Configuring time-based triggers</li>
            <li>Setting up daily routines</li>
            <li>Configuring device timers</li>
            <li>Setting up time-based rules</li>
          </ul>
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

  private _onTime3Changed(ev: CustomEvent) {
    this._timeValue3 = ev.detail.value;
  }

  private _onSelectorTimeChanged(ev: CustomEvent) {
    this._selectorTime = ev.detail.value;
  }

  private _onSelectorTimeWithSecondsChanged(ev: CustomEvent) {
    this._selectorTimeWithSeconds = ev.detail.value;
  }

  private _toggleSeconds() {
    this._enableSeconds = !this._enableSeconds;
  }

  private _resetValues() {
    this._timeValue = "14:30:00";
    this._timeValue2 = "09:15";
    this._timeValue3 = "16:45:30";
    this._selectorTime = "12:00";
    this._selectorTimeWithSeconds = "12:00:00";
  }

  private _setRandomTime() {
    const hours = Math.floor(Math.random() * 60);
    const minutes = Math.floor(Math.random() * 60);
    const seconds = Math.floor(Math.random() * 60);

    this._timeValue = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    this._timeValue2 = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    this._timeValue3 = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    this._selectorTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    this._selectorTimeWithSeconds = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-time-picker": DeveloperToolsTimePicker;
  }
}
