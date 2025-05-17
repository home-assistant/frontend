import type { PropertyValues, TemplateResult } from "lit";
import { css, LitElement, html, nothing } from "lit";
import { mdiAlertCircle, mdiMicrophone, mdiSend } from "@mdi/js";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { HomeAssistant } from "../types";
import {
  type PipelineRunEvent,
  runAssistPipeline,
  type AssistPipeline,
} from "../data/assist_pipeline";
import { supportsFeature } from "../common/entity/supports-feature";
import { ConversationEntityFeature } from "../data/conversation";
import { AudioRecorder } from "../util/audio-recorder";
import "./ha-alert";
import "./ha-textfield";
import type { HaTextField } from "./ha-textfield";
import { documentationUrl } from "../util/documentation-url";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";

interface AssistMessage {
  who: string;
  text?: string | TemplateResult;
  error?: boolean;
}

@customElement("ha-assist-chat")
export class HaAssistChat extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public pipeline?: AssistPipeline;

  @property({ type: Boolean, attribute: "disable-speech" })
  public disableSpeech = false;

  @property({ type: Boolean, attribute: false })
  public startListening?: boolean;

  @query("#message-input") private _messageInput!: HaTextField;

  @query("#scroll-container") private _scrollContainer!: HTMLDivElement;

  @state() private _conversation: AssistMessage[] = [];

  @state() private _showSendButton = false;

  @state() private _processing = false;

  private _conversationId: string | null = null;

  private _audioRecorder?: AudioRecorder;

  private _audioBuffer?: Int16Array[];

  private _audio?: HTMLAudioElement;

  private _stt_binary_handler_id?: number | null;

  protected willUpdate(changedProperties: PropertyValues): void {
    if (!this.hasUpdated || changedProperties.has("pipeline")) {
      this._conversation = [
        {
          who: "hass",
          text: this.hass.localize("ui.dialogs.voice_command.how_can_i_help"),
        },
      ];
    }
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (
      this.startListening &&
      this.pipeline &&
      this.pipeline.stt_engine &&
      AudioRecorder.isSupported
    ) {
      this._toggleListening();
    }
    setTimeout(() => this._messageInput.focus(), 0);
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_conversation")) {
      this._scrollMessagesBottom();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._audioRecorder?.close();
    this._audioRecorder = undefined;
    this._unloadAudio();
    this._conversation = [];
    this._conversationId = null;
  }

  protected render(): TemplateResult {
    const controlHA = !this.pipeline
      ? false
      : this.pipeline.prefer_local_intents ||
        (this.hass.states[this.pipeline.conversation_engine]
          ? supportsFeature(
              this.hass.states[this.pipeline.conversation_engine],
              ConversationEntityFeature.CONTROL
            )
          : true);
    const supportsMicrophone = AudioRecorder.isSupported;
    const supportsSTT = this.pipeline?.stt_engine && !this.disableSpeech;

    return html`
      <div class="messages" id="scroll-container">
        ${controlHA
          ? nothing
          : html`
              <ha-alert>
                ${this.hass.localize(
                  "ui.dialogs.voice_command.conversation_no_control"
                )}
              </ha-alert>
            `}
        <div class="spacer"></div>
        ${this._conversation!.map(
          // New lines matter for messages
          // prettier-ignore
          (message) => html`
                <div class="message ${classMap({ error: !!message.error, [message.who]: true })}">${message.text}</div>
              `
        )}
      </div>
      <div class="input" slot="primaryAction">
        <ha-textfield
          id="message-input"
          @keyup=${this._handleKeyUp}
          @input=${this._handleInput}
          .label=${this.hass.localize(`ui.dialogs.voice_command.input_label`)}
          .iconTrailing=${true}
        >
          <div slot="trailingIcon">
            ${this._showSendButton || !supportsSTT
              ? html`
                  <ha-icon-button
                    class="listening-icon"
                    .path=${mdiSend}
                    @click=${this._handleSendMessage}
                    .disabled=${this._processing}
                    .label=${this.hass.localize(
                      "ui.dialogs.voice_command.send_text"
                    )}
                  >
                  </ha-icon-button>
                `
              : html`
                  ${this._audioRecorder?.active
                    ? html`
                        <div class="bouncer">
                          <div class="double-bounce1"></div>
                          <div class="double-bounce2"></div>
                        </div>
                      `
                    : nothing}

                  <div class="listening-icon">
                    <ha-icon-button
                      .path=${mdiMicrophone}
                      @click=${this._handleListeningButton}
                      .disabled=${this._processing}
                      .label=${this.hass.localize(
                        "ui.dialogs.voice_command.start_listening"
                      )}
                    >
                    </ha-icon-button>
                    ${!supportsMicrophone
                      ? html`
                          <ha-svg-icon
                            .path=${mdiAlertCircle}
                            class="unsupported"
                          ></ha-svg-icon>
                        `
                      : null}
                  </div>
                `}
          </div>
        </ha-textfield>
      </div>
    `;
  }

  private _scrollMessagesBottom() {
    const scrollContainer = this._scrollContainer;
    if (!scrollContainer) {
      return;
    }
    scrollContainer.scrollTo(0, scrollContainer.scrollHeight);
  }

  private _handleKeyUp(ev: KeyboardEvent) {
    const input = ev.target as HaTextField;
    if (!this._processing && ev.key === "Enter" && input.value) {
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
      this._processText(this._messageInput.value.trim());
      this._messageInput.value = "";
      this._showSendButton = false;
    }
  }

  private _handleListeningButton(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    this._toggleListening();
  }

  private async _toggleListening() {
    const supportsMicrophone = AudioRecorder.isSupported;
    if (!supportsMicrophone) {
      this._showNotSupportedMessage();
      return;
    }
    if (!this._audioRecorder?.active) {
      this._startListening();
    } else {
      this._stopListening();
    }
  }

  private _addMessage(message: AssistMessage) {
    this._conversation = [...this._conversation!, message];
  }

  private async _showNotSupportedMessage() {
    this._addMessage({
      who: "hass",
      text:
        // New lines matter for messages
        // prettier-ignore
        html`${this.hass.localize(
          "ui.dialogs.voice_command.not_supported_microphone_browser"
        )}

        ${this.hass.localize(
          "ui.dialogs.voice_command.not_supported_microphone_documentation",
          {
            documentation_link: html`<a
                target="_blank"
                rel="noopener noreferrer"
                href=${documentationUrl(
                  this.hass,
                  "/docs/configuration/securing/#remote-access"
                )}
              >${this.hass.localize(
                  "ui.dialogs.voice_command.not_supported_microphone_documentation_link"
                )}</a>`,
          }
        )}`,
    });
  }

  private async _startListening() {
    this._unloadAudio();
    this._processing = true;
    if (!this._audioRecorder) {
      this._audioRecorder = new AudioRecorder((audio) => {
        if (this._audioBuffer) {
          this._audioBuffer.push(audio);
        } else {
          this._sendAudioChunk(audio);
        }
      });
    }
    this._stt_binary_handler_id = undefined;
    this._audioBuffer = [];
    const userMessage: AssistMessage = {
      who: "user",
      text: "…",
    };
    await this._audioRecorder.start();

    this._addMessage(userMessage);

    const hassMessageProcesser = this._createAddHassMessageProcessor();

    try {
      const unsub = await runAssistPipeline(
        this.hass,
        (event: PipelineRunEvent) => {
          if (event.type === "run-start") {
            this._stt_binary_handler_id =
              event.data.runner_data.stt_binary_handler_id;
            this._audio = new Audio(event.data.tts_output!.url);
            this._audio.play();
            this._audio.addEventListener("ended", () => {
              this._unloadAudio();
              if (hassMessageProcesser.continueConversation) {
                this._startListening();
              }
            });
            this._audio.addEventListener("pause", this._unloadAudio);
            this._audio.addEventListener("canplaythrough", () =>
              this._audio?.play()
            );
            this._audio.addEventListener("error", () => {
              this._unloadAudio();
              showAlertDialog(this, { title: "Error playing audio." });
            });
          }

          // When we start STT stage, the WS has a binary handler
          else if (event.type === "stt-start" && this._audioBuffer) {
            // Send the buffer over the WS to the STT engine.
            for (const buffer of this._audioBuffer) {
              this._sendAudioChunk(buffer);
            }
            this._audioBuffer = undefined;
          }

          // Stop recording if the server is done with STT stage
          else if (event.type === "stt-end") {
            this._stt_binary_handler_id = undefined;
            this._stopListening();
            userMessage.text = event.data.stt_output.text;
            this.requestUpdate("_conversation");
            // Add the response message placeholder to the chat when we know the STT is done
            hassMessageProcesser.addMessage();
          } else if (event.type.startsWith("intent-")) {
            hassMessageProcesser.processEvent(event);
          } else if (event.type === "run-end") {
            this._stt_binary_handler_id = undefined;
            unsub();
          } else if (event.type === "error") {
            this._unloadAudio();
            this._stt_binary_handler_id = undefined;
            if (userMessage.text === "…") {
              userMessage.text = event.data.message;
              userMessage.error = true;
            } else {
              hassMessageProcesser.setError(event.data.message);
            }
            this._stopListening();
            this.requestUpdate("_conversation");
            unsub();
          }
        },
        {
          start_stage: "stt",
          end_stage: this.pipeline?.tts_engine ? "tts" : "intent",
          input: { sample_rate: this._audioRecorder.sampleRate! },
          pipeline: this.pipeline?.id,
          conversation_id: this._conversationId,
        }
      );
    } catch (err: any) {
      await showAlertDialog(this, {
        title: "Error starting pipeline",
        text: err.message || err,
      });
      this._stopListening();
    } finally {
      this._processing = false;
    }
  }

  private _stopListening() {
    this._audioRecorder?.stop();
    this.requestUpdate("_audioRecorder");
    // We're currently STTing, so finish audio
    if (this._stt_binary_handler_id) {
      if (this._audioBuffer) {
        for (const chunk of this._audioBuffer) {
          this._sendAudioChunk(chunk);
        }
      }
      // Send empty message to indicate we're done streaming.
      this._sendAudioChunk(new Int16Array());
      this._stt_binary_handler_id = undefined;
    }
    this._audioBuffer = undefined;
  }

  private _sendAudioChunk(chunk: Int16Array) {
    this.hass.connection.socket!.binaryType = "arraybuffer";

    // eslint-disable-next-line eqeqeq
    if (this._stt_binary_handler_id == undefined) {
      return;
    }
    // Turn into 8 bit so we can prefix our handler ID.
    const data = new Uint8Array(1 + chunk.length * 2);
    data[0] = this._stt_binary_handler_id;
    data.set(new Uint8Array(chunk.buffer), 1);

    this.hass.connection.socket!.send(data);
  }

  private _unloadAudio = () => {
    if (!this._audio) {
      return;
    }
    this._audio.pause();
    this._audio.removeAttribute("src");
    this._audio = undefined;
  };

  private async _processText(text: string) {
    this._unloadAudio();
    this._processing = true;
    this._addMessage({ who: "user", text });
    const hassMessageProcesser = this._createAddHassMessageProcessor();
    hassMessageProcesser.addMessage();
    try {
      const unsub = await runAssistPipeline(
        this.hass,
        (event) => {
          if (event.type.startsWith("intent-")) {
            hassMessageProcesser.processEvent(event);
          }
          if (event.type === "intent-end") {
            unsub();
          }
          if (event.type === "error") {
            hassMessageProcesser.setError(event.data.message);
            unsub();
          }
        },
        {
          start_stage: "intent",
          input: { text },
          end_stage: "intent",
          pipeline: this.pipeline?.id,
          conversation_id: this._conversationId,
        }
      );
    } catch {
      hassMessageProcesser.setError(
        this.hass.localize("ui.dialogs.voice_command.error")
      );
    } finally {
      this._processing = false;
    }
  }

  private _createAddHassMessageProcessor() {
    let currentDeltaRole = "";

    const progressToNextMessage = () => {
      progress.hassMessage.text = progress.hassMessage.text.substring(
        0,
        progress.hassMessage.text.length - 1
      );

      progress.hassMessage = {
        who: "hass",
        text: "…",
        error: false,
      };
      this._addMessage(progress.hassMessage);
    };

    const progress = {
      continueConversation: false,
      hassMessage: {
        who: "hass",
        text: "…",
        error: false,
      },
      addMessage: () => {
        this._addMessage(progress.hassMessage);
      },
      setError: (error: string) => {
        if (progress.hassMessage.text !== "…") {
          progressToNextMessage();
        }
        progress.hassMessage.text = error;
        progress.hassMessage.error = true;
        this.requestUpdate("_conversation");
      },
      processEvent: (event: PipelineRunEvent) => {
        if (event.type === "intent-progress") {
          const delta = event.data.chat_log_delta;

          // new message
          if (delta.role) {
            // If currentDeltaRole exists, it means we're receiving our
            // second or later message. Let's add it to the chat.
            if (
              currentDeltaRole &&
              delta.role &&
              progress.hassMessage.text !== "…"
            ) {
              progressToNextMessage();
            }
            currentDeltaRole = delta.role;
          }

          if (
            currentDeltaRole === "assistant" &&
            "content" in delta &&
            delta.content
          ) {
            progress.hassMessage.text =
              progress.hassMessage.text.substring(
                0,
                progress.hassMessage.text.length - 1
              ) +
              delta.content +
              "…";
            this.requestUpdate("_conversation");
          }
        }

        if (event.type === "intent-end") {
          this._conversationId = event.data.intent_output.conversation_id;
          progress.continueConversation =
            event.data.intent_output.continue_conversation;
          const plain = event.data.intent_output.response.speech?.plain;
          if (plain) {
            progress.hassMessage.text = plain.speech;
          }
          this.requestUpdate("_conversation");
        }
      },
    };
    return progress;
  }

  static styles = css`
    :host {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    ha-alert {
      margin-bottom: 8px;
    }
    ha-textfield {
      display: block;
    }
    .messages {
      flex: 1;
      display: block;
      box-sizing: border-box;
      overflow-y: auto;
      max-height: 100%;
      display: flex;
      flex-direction: column;
      padding: 0 12px 16px;
    }
    .spacer {
      flex: 1;
    }
    .message {
      white-space: pre-line;
      font-size: var(--ha-font-size-l);
      clear: both;
      margin: 8px 0;
      padding: 8px;
      border-radius: 15px;
    }
    .message:last-child {
      margin-bottom: 0;
    }

    @media all and (max-width: 450px), all and (max-height: 500px) {
      .message {
        font-size: var(--ha-font-size-l);
      }
    }

    .message p {
      margin: 0;
    }
    .message p:not(:last-child) {
      margin-bottom: 8px;
    }

    .message.user {
      margin-left: 24px;
      margin-inline-start: 24px;
      margin-inline-end: initial;
      align-self: flex-end;
      text-align: right;
      border-bottom-right-radius: 0px;
      background-color: var(--chat-background-color-user, var(--primary-color));
      color: var(--text-primary-color);
      direction: var(--direction);
    }

    .message.hass {
      margin-right: 24px;
      margin-inline-end: 24px;
      margin-inline-start: initial;
      align-self: flex-start;
      border-bottom-left-radius: 0px;
      background-color: var(
        --chat-background-color-hass,
        var(--secondary-background-color)
      );

      color: var(--primary-text-color);
      direction: var(--direction);
    }

    .message.user a {
      color: var(--text-primary-color);
    }

    .message.hass a {
      color: var(--primary-text-color);
    }

    .message.error {
      background-color: var(--error-color);
      color: var(--text-primary-color);
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

    .listening-icon {
      position: relative;
      color: var(--secondary-text-color);
      margin-right: -24px;
      margin-inline-end: -24px;
      margin-inline-start: initial;
      direction: var(--direction);
      transform: scaleX(var(--scale-direction));
    }

    .listening-icon[active] {
      color: var(--primary-color);
    }

    .unsupported {
      color: var(--error-color);
      position: absolute;
      --mdc-icon-size: 16px;
      right: 5px;
      inset-inline-end: 5px;
      inset-inline-start: initial;
      top: 0px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-assist-chat": HaAssistChat;
  }
}
