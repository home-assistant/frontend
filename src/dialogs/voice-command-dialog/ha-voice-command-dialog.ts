/* eslint-disable lit/prefer-static-styles */
import "@material/mwc-button/mwc-button";
import { mdiMicrophone } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../common/dom/fire_event";
import { SpeechRecognition } from "../../common/dom/speech-recognition";
import { uid } from "../../common/util/uid";
import "../../components/ha-dialog";
import type { HaDialog } from "../../components/ha-dialog";
import "../../components/ha-icon-button";
import "../../components/ha-textfield";
import type { HaTextField } from "../../components/ha-textfield";
import {
  AgentInfo,
  getAgentInfo,
  processText,
  setConversationOnboarding,
} from "../../data/conversation";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";

interface Message {
  who: string;
  text?: string;
  error?: boolean;
}

interface Results {
  transcript: string;
  final: boolean;
}

@customElement("ha-voice-command-dialog")
export class HaVoiceCommandDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public results: Results | null = null;

  @state() private _conversation: Message[] = [
    {
      who: "hass",
      text: "",
    },
  ];

  @state() private _opened = false;

  @state() private _agentInfo?: AgentInfo;

  @query("ha-dialog", true) private _dialog!: HaDialog;

  private recognition!: SpeechRecognition;

  private _conversationId?: string;

  public async showDialog(): Promise<void> {
    this._opened = true;
    if (SpeechRecognition) {
      this._startListening();
    }
    this._agentInfo = await getAgentInfo(this.hass);
  }

  public async closeDialog(): Promise<void> {
    this._opened = false;
    if (this.recognition) {
      this.recognition.abort();
    }
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._opened) {
      return html``;
    }
    return html`
      <ha-dialog open @closed=${this.closeDialog}>
        <div>
          ${this._agentInfo && this._agentInfo.onboarding
            ? html`
                <div class="onboarding">
                  ${this._agentInfo.onboarding.text}
                  <div class="side-by-side" @click=${this._completeOnboarding}>
                    <a
                      class="button"
                      href=${this._agentInfo.onboarding.url}
                      target="_blank"
                      rel="noreferrer"
                      ><mwc-button unelevated
                        >${this.hass.localize("ui.common.yes")}!</mwc-button
                      ></a
                    >
                    <mwc-button outlined
                      >${this.hass.localize("ui.common.no")}</mwc-button
                    >
                  </div>
                </div>
              `
            : ""}
          ${this._conversation.map(
            (message) => html`
              <div class=${this._computeMessageClasses(message)}>
                ${message.text}
              </div>
            `
          )}
          ${this.results
            ? html`
                <div class="message user">
                  <span
                    class=${classMap({
                      interimTranscript: !this.results.final,
                    })}
                    >${this.results.transcript}</span
                  >${!this.results.final ? "…" : ""}
                </div>
              `
            : ""}
        </div>
        <div class="input" slot="primaryAction">
          <ha-textfield
            @keyup=${this._handleKeyUp}
            .label=${this.hass.localize(
              `ui.dialogs.voice_command.${
                SpeechRecognition ? "label_voice" : "label"
              }`
            )}
            dialogInitialFocus
            iconTrailing
          >
            ${SpeechRecognition
              ? html`
                  <span slot="trailingIcon">
                    ${this.results
                      ? html`
                          <div class="bouncer">
                            <div class="double-bounce1"></div>
                            <div class="double-bounce2"></div>
                          </div>
                        `
                      : ""}
                    <ha-icon-button
                      .path=${mdiMicrophone}
                      @click=${this._toggleListening}
                    >
                    </ha-icon-button>
                  </span>
                `
              : ""}
          </ha-textfield>
          ${this._agentInfo && this._agentInfo.attribution
            ? html`
                <a
                  href=${this._agentInfo.attribution.url}
                  class="attribution"
                  target="_blank"
                  rel="noreferrer"
                  >${this._agentInfo.attribution.name}</a
                >
              `
            : ""}
        </div>
      </ha-dialog>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.updated(changedProps);
    this._conversationId = uid();
    this._conversation = [
      {
        who: "hass",
        text: this.hass.localize("ui.dialogs.voice_command.how_can_i_help"),
      },
    ];
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_conversation") || changedProps.has("results")) {
      this._scrollMessagesBottom();
    }
  }

  private _addMessage(message: Message) {
    this._conversation = [...this._conversation, message];
  }

  private _handleKeyUp(ev: KeyboardEvent) {
    const input = ev.target as HaTextField;
    if (ev.keyCode === 13 && input.value) {
      this._processText(input.value);
      input.value = "";
    }
  }

  private _completeOnboarding() {
    setConversationOnboarding(this.hass, true);
    this._agentInfo! = { ...this._agentInfo, onboarding: undefined };
  }

  private _initRecognition() {
    this.recognition = new SpeechRecognition();
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    this.recognition.onstart = () => {
      this.results = {
        final: false,
        transcript: "",
      };
    };
    this.recognition.onerror = (event) => {
      this.recognition!.abort();
      // @ts-ignore
      if (event.error !== "aborted") {
        const text =
          this.results && this.results.transcript
            ? this.results.transcript
            : `<${this.hass.localize(
                "ui.dialogs.voice_command.did_not_hear"
              )}>`;
        this._addMessage({ who: "user", text, error: true });
      }
      this.results = null;
    };
    this.recognition.onend = () => {
      // Already handled by onerror
      if (this.results == null) {
        return;
      }
      const text = this.results.transcript;
      this.results = null;
      if (text) {
        this._processText(text);
      } else {
        this._addMessage({
          who: "user",
          text: `<${this.hass.localize(
            "ui.dialogs.voice_command.did_not_hear"
          )}>`,
          error: true,
        });
      }
    };

    this.recognition.onresult = (event) => {
      const result = event.results[0];
      this.results = {
        transcript: result[0].transcript,
        final: result.isFinal,
      };
    };
  }

  private async _processText(text: string) {
    if (this.recognition) {
      this.recognition.abort();
    }
    this._addMessage({ who: "user", text });
    const message: Message = {
      who: "hass",
      text: "…",
    };
    // To make sure the answer is placed at the right user text, we add it before we process it
    this._addMessage(message);
    try {
      const response = await processText(
        this.hass,
        text,
        this._conversationId!
      );
      const plain = response.speech.plain;
      message.text = plain.speech;

      this.requestUpdate("_conversation");
    } catch {
      message.text = this.hass.localize("ui.dialogs.voice_command.error");
      message.error = true;
      this.requestUpdate("_conversation");
    }
  }

  private _toggleListening() {
    if (!this.results) {
      this._startListening();
    } else {
      this.recognition!.stop();
    }
  }

  private _startListening() {
    if (!this.recognition) {
      this._initRecognition();
    }

    if (this.results) {
      return;
    }

    this.results = {
      transcript: "",
      final: false,
    };
    this.recognition!.start();
  }

  private _scrollMessagesBottom() {
    this._dialog.scrollToPos(0, 99999);
  }

  private _computeMessageClasses(message: Message) {
    return `message ${message.who} ${message.error ? " error" : ""}`;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-icon-button {
          color: var(--secondary-text-color);
          margin-right: -24px;
          margin-inline-end: -24px;
          margin-inline-start: initial;
          direction: var(--direction);
        }

        ha-icon-button[active] {
          color: var(--primary-color);
        }

        ha-dialog {
          --primary-action-button-flex: 1;
          --secondary-action-button-flex: 0;
          --mdc-dialog-max-width: 450px;
        }
        ha-textfield {
          display: block;
        }
        a.button {
          text-decoration: none;
        }
        a.button > mwc-button {
          width: 100%;
        }
        .onboarding {
          border-bottom: 1px solid var(--divider-color);
        }
        .side-by-side {
          display: flex;
          margin: 8px 0;
        }
        .side-by-side > * {
          flex: 1 0;
          padding: 4px;
        }
        .attribution {
          color: var(--secondary-text-color);
        }
        .message {
          font-size: 18px;
          clear: both;
          margin: 8px 0;
          padding: 8px;
          border-radius: 15px;
        }

        .message.user {
          margin-left: 24px;
          margin-inline-start: 24px;
          margin-inline-end: initial;
          float: var(--float-end);
          text-align: right;
          border-bottom-right-radius: 0px;
          background-color: var(--light-primary-color);
          color: var(--text-light-primary-color, var(--primary-text-color));
          direction: var(--direction);
        }

        .message.hass {
          margin-right: 24px;
          margin-inline-end: 24px;
          margin-inline-start: initial;
          float: var(--float-start);
          border-bottom-left-radius: 0px;
          background-color: var(--primary-color);
          color: var(--text-primary-color);
          direction: var(--direction);
        }

        .message a {
          color: var(--text-primary-color);
        }

        .message img {
          width: 100%;
          border-radius: 10px;
        }

        .message.error {
          background-color: var(--error-color);
          color: var(--text-primary-color);
        }

        .interimTranscript {
          color: var(--secondary-text-color);
        }

        .bouncer {
          width: 48px;
          height: 48px;
          position: absolute;
        }
        .double-bounce1,
        .double-bounce2 {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: var(--primary-color);
          opacity: 0.2;
          position: absolute;
          top: 0;
          left: 0;
          -webkit-animation: sk-bounce 2s infinite ease-in-out;
          animation: sk-bounce 2s infinite ease-in-out;
        }
        .double-bounce2 {
          -webkit-animation-delay: -1s;
          animation-delay: -1s;
        }
        @-webkit-keyframes sk-bounce {
          0%,
          100% {
            -webkit-transform: scale(0);
          }
          50% {
            -webkit-transform: scale(1);
          }
        }
        @keyframes sk-bounce {
          0%,
          100% {
            transform: scale(0);
            -webkit-transform: scale(0);
          }
          50% {
            transform: scale(1);
            -webkit-transform: scale(1);
          }
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          .message {
            font-size: 16px;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-command-dialog": HaVoiceCommandDialog;
  }
}
