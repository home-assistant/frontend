import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-dialog-behavior/paper-dialog-shared-styles";
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
} from "lit-element";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { processText } from "../../data/conversation";
import { classMap } from "lit-html/directives/class-map";
import { PaperInputElement } from "@polymer/paper-input/paper-input";

interface Message {
  who: string;
  text: string;
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
  window.webkitSpeechRecognition || window.SpeechRecognition;
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
  @query("#messages") private messages!: HTMLDivElement;
  private recognition?: SpeechRecognition;

  public async showDialog(): Promise<void> {
    this._opened = true;
    if (SpeechRecognition) {
      this._startListening();
    }
  }

  protected render() {
    return html`
      <ha-paper-dialog
        with-backdrop
        .opened=${this._opened}
        @opened-changed=${this._openedChanged}
      >
        <div class="content">
          <div class="messages" id="messages">
            ${this._conversation.map(
              (message) => html`
                <div class="${this._computeMessageClasses(message)}">
                  ${message.text}
                </div>
              `
            )}
          </div>
          ${this.results
            ? html`
                <div class="messages">
                  <div class="message user">
                    <span
                      class=${classMap({
                        interimTranscript: !this.results.final,
                      })}
                      >${this.results.transcript}</span
                    >${!this.results.final ? "…" : ""}
                  </div>
                </div>
              `
            : ""}
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
                    <paper-icon-button
                      .disabled=${Boolean(this.results)}
                      icon="hass:microphone"
                      @click=${this._startListening}
                    ></paper-icon-button>
                  </span>
                `
              : ""}
          </paper-input>
        </div>
      </ha-paper-dialog>
    `;
  }

  protected firstUpdated(changedPros: PropertyValues) {
    super.updated(changedPros);
    this._conversation = [
      {
        who: "hass",
        text: this.hass.localize("ui.dialogs.voice_command.how_can_i_help"),
      },
    ];
  }

  protected updated(changedPros: PropertyValues) {
    super.updated(changedPros);
    if (changedPros.has("_conversation")) {
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

  private _initRecognition() {
    this.recognition = new SpeechRecognition();
    this.recognition.interimResults = true;

    this.recognition!.onstart = () => {
      this.results = {
        final: false,
        transcript: "",
      };
    };
    this.recognition!.onerror = () => {
      this.recognition!.abort();
      const text =
        this.results && this.results.transcript
          ? this.results.transcript
          : this.hass.localize("ui.dialogs.voice_command.did_not_hear");
      this.results = null;
      this._addMessage({ who: "user", text, error: true });
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
          text: this.hass.localize("ui.dialogs.voice_command.did_not_hear"),
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
    this._addMessage({ who: "user", text });
    try {
      const response = await processText(this.hass, text);
      this._addMessage({
        who: "hass",
        text: response.speech.plain.speech,
      });
    } catch {
      this._conversation.slice(-1).pop()!.error = true;
      this.requestUpdate();
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
    this.messages.scrollTop = this.messages.scrollHeight;

    if (this.messages.scrollTop === 0) {
      fireEvent(this.messages, "iron-resize");
    }
  }

  private _openedChanged(ev: CustomEvent) {
    this._opened = ev.detail.value;
    if (!this._opened && this.recognition) {
      this.recognition.abort();
    }
  }

  private _computeMessageClasses(message) {
    return "message " + message.who + (message.error ? " error" : "");
  }

  static get styles(): CSSResult {
    return css`
      paper-icon-button {
        color: var(--secondary-text-color);
      }

      paper-icon-button[disabled] {
        color: var(--primary-color);
      }

      .content {
        width: 450px;
        min-height: 80px;
        font-size: 18px;
        padding: 16px;
      }

      .messages {
        max-height: 50vh;
        overflow: auto;
      }

      .messages::after {
        content: "";
        clear: both;
        display: block;
      }

      .message {
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

      .message.error {
        background-color: var(--google-red-500);
        color: var(--text-primary-color);
      }

      .interimTranscript {
        color: darkgrey;
      }

      [hidden] {
        display: none;
      }

      :host {
        border-radius: 2px;
      }

      @media all and (max-width: 450px) {
        :host {
          margin: 0;
          width: 100%;
          max-height: calc(100% - 64px);

          position: fixed !important;
          bottom: 0px;
          left: 0px;
          right: 0px;
          overflow: auto;
          border-bottom-left-radius: 0px;
          border-bottom-right-radius: 0px;
        }

        .messages {
          max-height: 68vh;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-command-dialog": HaVoiceCommandDialog;
  }
}
