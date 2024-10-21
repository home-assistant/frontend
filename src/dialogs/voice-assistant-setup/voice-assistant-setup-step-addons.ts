import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";
import { AssistantSetupStyles } from "./styles";
import { STEP } from "./voice-assistant-setup-dialog";
import { documentationUrl } from "../../util/documentation-url";

@customElement("ha-voice-assistant-setup-step-addons")
export class HaVoiceAssistantSetupStepAddons extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _showFirst = false;

  @state() private _showSecond = false;

  @state() private _showThird = false;

  @state() private _showFourth = false;

  protected override firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    setTimeout(() => {
      this._showFirst = true;
    }, 200);
    setTimeout(() => {
      this._showSecond = true;
    }, 600);
    setTimeout(() => {
      this._showThird = true;
    }, 3000);
    setTimeout(() => {
      this._showFourth = true;
    }, 8000);
  }

  protected override render() {
    return html`<div class="content">
        <h1>Local</h1>
        <p class="secondary">
          Are you sure you want to use the local voice assistant? It requires a
          powerful device to run. If you device is not powerful enough, Home
          Assistant cloud might be a better option.
        </p>
        <h3>Raspberry Pi 4</h3>
        <div class="messages-container rpi">
          <div class="message user ${this._showThird ? "show" : ""}">
            ${!this._showThird ? "…" : "Turn on the lights in the bedroom"}
          </div>
          ${this._showThird
            ? html`<div class="timing user">3 seconds</div>`
            : nothing}
          ${this._showThird
            ? html`<div class="message hass ${this._showFourth ? "show" : ""}">
                ${!this._showFourth ? "…" : "Turned on the lights"}
              </div>`
            : nothing}
          ${this._showFourth
            ? html`<div class="timing hass">5 seconds</div>`
            : nothing}
        </div>
        <h3>Home Assistant Cloud</h3>
        <div class="messages-container cloud">
          <div class="message user ${this._showFirst ? "show" : ""}">
            ${!this._showFirst ? "…" : "Turn on the lights in the bedroom"}
          </div>
          ${this._showFirst
            ? html`<div class="timing user">0.2 seconds</div>`
            : nothing}
          ${this._showFirst
            ? html` <div class="message hass ${this._showSecond ? "show" : ""}">
                ${!this._showSecond ? "…" : "Turned on the lights"}
              </div>`
            : nothing}
          ${this._showSecond
            ? html`<div class="timing hass">0.4 seconds</div>`
            : nothing}
        </div>
      </div>
      <div class="footer side-by-side">
        <ha-button @click=${this._goToCloud}
          >Try Home Assistant Cloud</ha-button
        >
        <a
          href=${documentationUrl(
            this.hass,
            "/voice_control/voice_remote_local_assistant/"
          )}
          target="_blank"
          rel="noreferrer noopenner"
        >
          <ha-button @click=${this._skip} unelevated>Learn more</ha-button>
        </a>
      </div>`;
  }

  private _goToCloud() {
    fireEvent(this, "next-step", { step: STEP.CLOUD });
  }

  private _skip() {
    fireEvent(this, "next-step", { step: STEP.SUCCESS });
  }

  static styles = [
    AssistantSetupStyles,
    css`
      .messages-container {
        padding: 24px;
        box-sizing: border-box;
        height: 195px;
        background: var(--input-fill-color);
        border-radius: 16px;
        border: 1px solid var(--divider-color);
        display: flex;
        flex-direction: column;
      }
      .message {
        white-space: nowrap;
        font-size: 18px;
        clear: both;
        margin: 8px 0;
        padding: 8px;
        border-radius: 15px;
        height: 36px;
        box-sizing: border-box;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 30px;
      }
      .rpi .message {
        transition: width 1s;
      }
      .cloud .message {
        transition: width 0.5s;
      }

      .message.user {
        margin-left: 24px;
        margin-inline-start: 24px;
        margin-inline-end: initial;
        align-self: self-end;
        text-align: right;
        border-bottom-right-radius: 0px;
        background-color: var(--primary-color);
        color: var(--text-primary-color);
        direction: var(--direction);
      }
      .timing.user {
        align-self: self-end;
      }

      .message.user.show {
        width: 295px;
      }

      .message.hass {
        margin-right: 24px;
        margin-inline-end: 24px;
        margin-inline-start: initial;
        align-self: self-start;
        border-bottom-left-radius: 0px;
        background-color: var(--secondary-background-color);
        color: var(--primary-text-color);
        direction: var(--direction);
      }
      .timing.hass {
        align-self: self-start;
      }

      .message.hass.show {
        width: 184px;
      }
      .footer {
        margin-top: 24px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-addons": HaVoiceAssistantSetupStepAddons;
  }
}
