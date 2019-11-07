import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-icon-button/paper-icon-button";
import "../../components/dialog/ha-paper-dialog";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";

import {
  LitElement,
  html,
  property,
  CSSResult,
  css,
  customElement,
  query,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import {
  processText,
  getConversationOnboarding,
  getConversationAttribution,
  setConversationOnboarding,
  ConversationAttribution,
  ConversationOnboarding,
} from "../../data/conversation";
import { classMap } from "lit-html/directives/class-map";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { haStyleDialog } from "../../resources/styles";
// tslint:disable-next-line
import { PaperDialogScrollableElement } from "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import { isComponentLoaded } from "../../common/config/is_component_loaded";

interface Message {
  who: string;
  text?: string;
  error?: boolean;
}

interface Results {
  transcript: string;
  final: boolean;
}

/* tslint:disable */
// @ts-ignore
window.SpeechRecognition =
  // @ts-ignore
  window.SpeechRecognition || window.webkitSpeechRecognition;
// @ts-ignore
window.SpeechGrammarList =
  // @ts-ignore
  window.SpeechGrammarList || window.webkitSpeechGrammarList;
// @ts-ignore
window.SpeechRecognitionEvent =
  // @ts-ignore
  window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;
/* tslint:enable */

@customElement("ha-voice-command-dialog")
export class HaVoiceCommandDialog extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public results: Results | null = null;
  @property() private _conversation: Message[] = [
    {
      who: "hass",
      text: "",
    },
  ];
  @property() private _opened = false;
  @property() private _onboarding?: ConversationOnboarding;
  @property() private _attribution?: ConversationAttribution;
  @query("#messages") private messages!: PaperDialogScrollableElement;
  private recognition?: SpeechRecognition;

  public async showDialog(): Promise<void> {
    this._opened = true;
    if (SpeechRecognition) {
      this._startListening();
    }
    this._onboarding = await getConversationOnboarding(this.hass);
    this._attribution = await getConversationAttribution(this.hass);
  }

  protected render(): TemplateResult {
    // CSS custom property mixins only work in render https://github.com/Polymer/lit-element/issues/633
    return html`
      <style>
        paper-dialog-scrollable {
          --paper-dialog-scrollable: {
            -webkit-overflow-scrolling: auto;
            max-height: 50vh !important;
          }
        }

        paper-dialog-scrollable.can-scroll {
          --paper-dialog-scrollable: {
            -webkit-overflow-scrolling: touch;
            max-height: 50vh !important;
          }
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          paper-dialog-scrollable {
            --paper-dialog-scrollable: {
              -webkit-overflow-scrolling: auto;
              max-height: calc(100vh - 175px) !important;
            }
          }

          paper-dialog-scrollable.can-scroll {
            --paper-dialog-scrollable: {
              -webkit-overflow-scrolling: touch;
              max-height: calc(100vh - 175px) !important;
            }
          }
        }
      </style>
      <ha-paper-dialog
        with-backdrop
        .opened=${this._opened}
        @opened-changed=${this._openedChanged}
      >
        <paper-dialog-scrollable id="messages">
          ${this._onboarding
            ? html`
                <div @click=${this._completeOnboarding}>
                  <a
                    class="button"
                    href="${this._onboarding.url}"
                    target="_blank"
                    ><mwc-button class="full-width"
                      >${this._onboarding.text}</mwc-button
                    ></a
                  >
                  <br />
                  <mwc-button class="full-width"
                    >No, I don't want to help</mwc-button
                  >
                  <br />
                </div>
              `
            : ""}
          ${this._conversation.map(
            (message) => html`
              <div class="${this._computeMessageClasses(message)}">
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
        </paper-dialog-scrollable>
        <div class="input">
          <paper-input
            @keyup=${this._handleKeyUp}
            label="${this.hass!.localize(
              `ui.dialogs.voice_command.${
                SpeechRecognition ? "label_voice" : "label"
              }`
            )}"
            autofocus
          >
            ${SpeechRecognition
              ? html`
                  <span suffix="" slot="suffix">
                    ${this.results
                      ? html`
                          <div class="bouncer">
                            <div class="double-bounce1"></div>
                            <div class="double-bounce2"></div>
                          </div>
                        `
                      : ""}
                    <paper-icon-button
                      .active=${Boolean(this.results)}
                      icon="hass:microphone"
                      @click=${this._toggleListening}
                    >
                    </paper-icon-button>
                  </span>
                `
              : ""}
          </paper-input>
          ${this._attribution
            ? html`
                <a
                  href=${this._attribution.url}
                  class="attribution"
                  target="_blank"
                  >${this._attribution.name}</a
                >
              `
            : ""}
        </div>
      </ha-paper-dialog>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.updated(changedProps);
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
    const input = ev.target as PaperInputElement;
    if (ev.keyCode === 13 && input.value) {
      this._processText(input.value);
      input.value = "";
    }
  }

  private _completeOnboarding() {
    setConversationOnboarding(this.hass, true);
    this._onboarding = undefined;
  }

  private _initRecognition() {
    this.recognition = new SpeechRecognition();
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    this.recognition!.onstart = () => {
      this.results = {
        final: false,
        transcript: "",
      };
    };
    this.recognition!.onerror = (event) => {
      this.recognition!.abort();
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
    this.recognition!.onend = () => {
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

    this.recognition!.onresult = (event) => {
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
      const response = await processText(this.hass, text);
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
    this.messages.scrollTarget.scrollTop = this.messages.scrollTarget.scrollHeight;
    if (this.messages.scrollTarget.scrollTop === 0) {
      fireEvent(this.messages, "iron-resize");
    }
  }

  private _openedChanged(ev: CustomEvent) {
    this._opened = ev.detail.value;
    if (!this._opened && this.recognition) {
      this.recognition.abort();
    }
  }

  private _computeMessageClasses(message: Message) {
    return `message ${message.who} ${message.error ? " error" : ""}`;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        :host {
          z-index: 103;
        }

        paper-icon-button {
          color: var(--secondary-text-color);
        }

        paper-icon-button[active] {
          color: var(--primary-color);
        }

        .input {
          margin: 0 0 16px 0;
        }

        ha-paper-dialog {
          width: 450px;
        }
        a.button {
          text-decoration: none;
        }
        .full-width {
          width: 100%;
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
          float: right;
          text-align: right;
          border-bottom-right-radius: 0px;
          background-color: var(--light-primary-color);
          color: var(--primary-text-color);
        }

        .message.hass {
          margin-right: 24px;
          float: left;
          border-bottom-left-radius: 0px;
          background-color: var(--primary-color);
          color: var(--text-primary-color);
        }

        .message a {
          color: var(--text-primary-color);
        }

        .message img {
          width: 100%;
          border-radius: 10px;
        }

        .message.error {
          background-color: var(--google-red-500);
          color: var(--text-primary-color);
        }

        .interimTranscript {
          color: var(--secondary-text-color);
        }

        .bouncer {
          width: 40px;
          height: 40px;
          position: absolute;
          top: 0;
        }
        .double-bounce1,
        .double-bounce2 {
          width: 40px;
          height: 40px;
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
