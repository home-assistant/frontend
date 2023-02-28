/* eslint-disable lit/prefer-static-styles */
import "@material/mwc-button/mwc-button";
import {
  mdiClose,
  mdiHelpCircleOutline,
  mdiMicrophone,
  mdiSend,
} from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../common/dom/fire_event";
import { SpeechRecognition } from "../../common/dom/speech-recognition";
import "../../components/ha-dialog";
import type { HaDialog } from "../../components/ha-dialog";
import "../../components/ha-header-bar";
import "../../components/ha-icon-button";
import "../../components/ha-textfield";
import type { HaTextField } from "../../components/ha-textfield";
import {
  AgentInfo,
  getAgentInfo,
  prepareConversation,
  processConversationInput,
} from "../../data/conversation";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";

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

  @state() private _showSendButton = false;

  @query("#scroll-container") private _scrollContainer!: HaDialog;

  @query("#message-input") private _messageInput!: HaTextField;

  private recognition!: SpeechRecognition;

  private _conversationId: string | null = null;

  public async showDialog(): Promise<void> {
    this._opened = true;
    this._agentInfo = await getAgentInfo(this.hass);
    this._scrollMessagesBottom();
  }

  public async closeDialog(): Promise<void> {
    this._opened = false;
    if (this.recognition) {
      this.recognition.abort();
    }
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this.hass.localize("ui.dialogs.voice_command.title")}
        flexContent
      >
        <div slot="heading">
          <ha-header-bar>
            <span slot="title">
              ${this.hass.localize("ui.dialogs.voice_command.title")}
            </span>
            <ha-icon-button
              slot="navigationIcon"
              dialogAction="cancel"
              .label=${this.hass.localize("ui.common.close")}
              .path=${mdiClose}
            ></ha-icon-button>
            <a
              href=${documentationUrl(this.hass, "/docs/assist/")}
              slot="actionItems"
              target="_blank"
              rel="noopener noreferer"
            >
              <ha-icon-button
                .label=${this.hass.localize("ui.common.help")}
                .path=${mdiHelpCircleOutline}
              ></ha-icon-button>
            </a>
          </ha-header-bar>
        </div>
        <div class="messages">
          <div class="messages-container" id="scroll-container">
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
        </div>
        <div class="input" slot="primaryAction">
          <ha-textfield
            id="message-input"
            @keyup=${this._handleKeyUp}
            @input=${this._handleInput}
            .label=${this.hass.localize(`ui.dialogs.voice_command.input_label`)}
            dialogInitialFocus
            iconTrailing
          >
            <span slot="trailingIcon">
              ${this._showSendButton
                ? html`
                    <ha-icon-button
                      class="listening-icon"
                      .path=${mdiSend}
                      @click=${this._handleSendMessage}
                      .label=${this.hass.localize(
                        "ui.dialogs.voice_command.send_text"
                      )}
                    >
                    </ha-icon-button>
                  `
                : SpeechRecognition
                ? html`
                    ${this.results
                      ? html`
                          <div class="bouncer">
                            <div class="double-bounce1"></div>
                            <div class="double-bounce2"></div>
                          </div>
                        `
                      : ""}
                    <ha-icon-button
                      class="listening-icon"
                      .path=${mdiMicrophone}
                      @click=${this._toggleListening}
                      .label=${this.hass.localize(
                        "ui.dialogs.voice_command.start_listening"
                      )}
                    >
                    </ha-icon-button>
                  `
                : ""}
            </span>
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
    this._conversation = [
      {
        who: "hass",
        text: this.hass.localize("ui.dialogs.voice_command.how_can_i_help"),
      },
    ];
    prepareConversation(this.hass, this.hass.language);
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
      this._showSendButton = false;
    }
  }

  private _handleInput(ev: InputEvent) {
    const value = (ev.target as HaTextField).value;
    if (value && !this._showSendButton) {
      this._showSendButton = true;
    } else if (!value && this._showSendButton) {
      this._showSendButton = false;
    }
  }

  private _handleSendMessage() {
    if (this._messageInput.value) {
      this._processText(this._messageInput.value);
      this._messageInput.value = "";
      this._showSendButton = false;
    }
  }

  private _initRecognition() {
    this.recognition = new SpeechRecognition();
    this.recognition.interimResults = true;
    this.recognition.lang = this.hass.language;
    this.recognition.continuous = false;

    this.recognition.addEventListener("start", () => {
      this.results = {
        final: false,
        transcript: "",
      };
    });
    this.recognition.addEventListener("nomatch", () => {
      this._addMessage({
        who: "user",
        text: `<${this.hass.localize(
          "ui.dialogs.voice_command.did_not_understand"
        )}>`,
        error: true,
      });
    });
    this.recognition.addEventListener("error", (event) => {
      // eslint-disable-next-line
      console.error("Error recognizing text", event);
      this.recognition!.abort();
      // @ts-ignore
      if (event.error !== "aborted" && event.error !== "no-speech") {
        const text =
          this.results && this.results.transcript
            ? this.results.transcript
            : `<${this.hass.localize(
                "ui.dialogs.voice_command.did_not_hear"
              )}>`;
        this._addMessage({ who: "user", text, error: true });
      }
      this.results = null;
    });
    this.recognition.addEventListener("end", () => {
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
    });
    this.recognition.addEventListener("result", (event) => {
      const result = event.results[0];
      this.results = {
        transcript: result[0].transcript,
        final: result.isFinal,
      };
    });
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
      const response = await processConversationInput(
        this.hass,
        text,
        this._conversationId,
        this.hass.language
      );
      this._conversationId = response.conversation_id;
      const plain = response.response.speech?.plain;
      if (plain) {
        message.text = plain.speech;
      } else {
        message.text = "<silence>";
      }

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
      this._stopListening();
    }
  }

  private _stopListening() {
    if (this.recognition) {
      this.recognition.stop();
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
    this._scrollContainer.scrollTo(0, 99999);
  }

  private _computeMessageClasses(message: Message) {
    return `message ${message.who} ${message.error ? " error" : ""}`;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-icon-button.listening-icon {
          color: var(--secondary-text-color);
          margin-right: -24px;
          margin-inline-end: -24px;
          margin-inline-start: initial;
          direction: var(--direction);
        }

        ha-icon-button.listening-icon[active] {
          color: var(--primary-color);
        }

        ha-dialog {
          --primary-action-button-flex: 1;
          --secondary-action-button-flex: 0;
          --mdc-dialog-max-width: 450px;
          --mdc-dialog-max-height: 500px;
          --dialog-content-padding: 0;
        }
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
        }
        ha-header-bar a {
          color: var(--primary-text-color);
        }

        ha-textfield {
          display: block;
          overflow: hidden;
        }
        a.button {
          text-decoration: none;
        }
        a.button > mwc-button {
          width: 100%;
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
        .messages {
          display: block;
          height: 300px;
          box-sizing: border-box;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          .messages {
            height: 100%;
          }
        }
        .messages-container {
          position: absolute;
          bottom: 0px;
          right: 0px;
          left: 0px;
          padding: 24px;
          box-sizing: border-box;
          overflow-y: auto;
          max-height: 100%;
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

        .input {
          margin-left: 0;
          margin-right: 0;
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
