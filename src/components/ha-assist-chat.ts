import {
  mdiAlertCircle,
  mdiChevronDown,
  mdiChevronUp,
  mdiCommentProcessingOutline,
  mdiMicrophone,
  mdiSend,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consume } from "../common/decorators/consume";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { transform } from "../common/decorators/transform";
import { supportsFeature } from "../common/entity/supports-feature";
import type { LocalizeFunc } from "../common/translations/localize";
import {
  createAssistMessageProcessor,
  type AssistMessage,
  type AssistMessageProcessor,
} from "../data/assist_chat";
import {
  runAssistPipeline,
  type AssistPipeline,
  type PipelineRunEvent,
} from "../data/assist_pipeline";
import {
  configContext,
  connectionContext,
  internationalizationContext,
  statesContext,
} from "../data/context";
import { ConversationEntityFeature } from "../data/conversation";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import { haStyleScrollbar } from "../resources/styles";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantConnection,
  HomeAssistantInternationalization,
} from "../types";
import { AudioRecorder } from "../util/audio-recorder";
import {
  findAvailableLanguage,
  getTranslation,
} from "../util/common-translation";
import {
  documentationUrl,
  SECURE_CONNECTION_DOCUMENTATION_PATH,
} from "../util/documentation-url";
import "./ha-alert";
import "./ha-markdown";
import "./input/ha-input";
import type { HaInput } from "./input/ha-input";

export const initialPromptToSubmit = (
  prompt: string | undefined,
  submit: boolean
): string | undefined => (submit ? prompt?.trim() || undefined : undefined);

export const assistPipelineChanged = (
  previous: AssistPipeline | undefined,
  current: AssistPipeline | undefined
): boolean => previous?.id !== current?.id;

export const greetingTranslationLanguage = (
  pipelineLanguage: string | undefined,
  interfaceLanguage: string | undefined
): string | undefined => {
  if (!pipelineLanguage || pipelineLanguage === interfaceLanguage) {
    return undefined;
  }
  // A bare pipeline language ("zh") covers the interface's variant of it
  // ("zh-Hans"), which a lookup of the bare language may not pick
  if (
    !pipelineLanguage.includes("-") &&
    interfaceLanguage?.startsWith(`${pipelineLanguage}-`)
  ) {
    return undefined;
  }
  const language = findAvailableLanguage(pipelineLanguage);
  return language && language !== interfaceLanguage ? language : undefined;
};

@customElement("ha-assist-chat")
export class HaAssistChat extends LitElement {
  @property({ attribute: false }) public pipeline?: AssistPipeline;

  @property({ type: Boolean, attribute: "disable-speech" })
  public disableSpeech = false;

  @property({ attribute: false })
  public startListening?: boolean;

  @property({ attribute: false })
  public initialPrompt?: string;

  @property({ attribute: false })
  public submitInitialPrompt = false;

  @query("#message-input") private _messageInput!: HaInput;

  @query(".message:last-child")
  private _lastChatMessage!: LitElement;

  @query(".message:last-child img:last-of-type")
  private _lastChatMessageImage: HTMLImageElement | undefined;

  @state() private _conversation: AssistMessage[] = [];

  @state() private _showSendButton = false;

  @state() private _processing = false;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, string>({
    transformer: ({ language }) => language,
  })
  private _language!: string;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: HomeAssistant["states"];

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: HomeAssistantConfig;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: HomeAssistantConnection;

  private _conversationId: string | null = null;

  private _greetingLoadToken = 0;

  private _initialPromptSubmitted = false;

  private _audioRecorder?: AudioRecorder;

  private _audioBuffer?: Int16Array[];

  private _audio?: HTMLAudioElement;

  private _stt_binary_handler_id?: number | null;

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (
      !this.hasUpdated ||
      (changedProperties.has("pipeline") &&
        assistPipelineChanged(changedProperties.get("pipeline"), this.pipeline))
    ) {
      this._conversation = [];
      this._loadGreeting();
    }
  }

  private async _loadGreeting(): Promise<void> {
    const token = ++this._greetingLoadToken;
    const language = greetingTranslationLanguage(
      this.pipeline?.language,
      this._language
    );
    let greeting: string | undefined;
    if (language) {
      try {
        const result = await getTranslation(null, language, false);
        if (result.language === language) {
          greeting = result.data["ui.dialogs.voice_command.how_can_i_help"];
        }
      } catch (_err) {
        // Translation failed to load; fall back to the interface language.
      }
    }
    if (token !== this._greetingLoadToken) {
      // The pipeline changed while loading; a newer load owns the greeting.
      return;
    }
    this._conversation = [
      {
        who: "hass",
        text:
          greeting || this._localize("ui.dialogs.voice_command.how_can_i_help"),
        thinking: "",
        tool_calls: {},
      },
      ...this._conversation,
    ];
  }

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
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
    if (changedProps.has("_conversation") && this._conversation.length) {
      this._scrollMessagesBottom();
    }
    if (
      !this._initialPromptSubmitted &&
      (changedProps.has("initialPrompt") ||
        changedProps.has("submitInitialPrompt"))
    ) {
      const prompt = initialPromptToSubmit(
        this.initialPrompt,
        this.submitInitialPrompt
      );
      if (prompt) {
        this._initialPromptSubmitted = true;
        this._processText(prompt);
      }
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._audioRecorder?.close();
    this._unloadAudio();
  }

  protected render(): TemplateResult {
    const controlHA = !this.pipeline
      ? false
      : this.pipeline.prefer_local_intents ||
        (this._states[this.pipeline.conversation_engine]
          ? supportsFeature(
              this._states[this.pipeline.conversation_engine],
              ConversationEntityFeature.CONTROL
            )
          : true);
    const supportsMicrophone = AudioRecorder.isSupported;
    const supportsSTT = this.pipeline?.stt_engine && !this.disableSpeech;

    return html`
      <div class="messages ha-scrollbar">
        ${
          controlHA
            ? nothing
            : html`
                <ha-alert>
                  ${this._localize(
                    "ui.dialogs.voice_command.conversation_no_control"
                  )}
                </ha-alert>
              `
        }
        <div class="spacer"></div>
        ${this._conversation!.map(
          (message, index) => html`
            <div class="message-container ${classMap({ [message.who]: true })}">
              ${
                message.text ||
                message.error ||
                message.thinking ||
                (message.tool_calls &&
                  Object.keys(message.tool_calls).length > 0)
                  ? html`
                      <div
                        class="message ${classMap({
                          error: !!message.error,
                          [message.who]: true,
                        })}"
                      >
                        ${
                          message.thinking ||
                          (message.tool_calls &&
                            Object.keys(message.tool_calls).length > 0)
                            ? html`
                                <div
                                  class="thinking-wrapper ${classMap({
                                    expanded: !!message.thinking_expanded,
                                  })}"
                                >
                                  <button
                                    class="thinking-header"
                                    .index=${index}
                                    @click=${this._handleToggleThinking}
                                    aria-expanded=${
                                      message.thinking_expanded
                                        ? "true"
                                        : "false"
                                    }
                                  >
                                    <ha-svg-icon
                                      .path=${mdiCommentProcessingOutline}
                                    ></ha-svg-icon>
                                    <span class="thinking-label">
                                      ${this._localize(
                                        "ui.dialogs.voice_command.show_details"
                                      )}
                                    </span>
                                    <ha-svg-icon
                                      .path=${
                                        message.thinking_expanded
                                          ? mdiChevronUp
                                          : mdiChevronDown
                                      }
                                    ></ha-svg-icon>
                                  </button>
                                  <div class="thinking-content">
                                    ${
                                      message.thinking
                                        ? html`<ha-markdown
                                            .content=${message.thinking}
                                          ></ha-markdown>`
                                        : nothing
                                    }
                                    ${
                                      message.tool_calls &&
                                      Object.keys(message.tool_calls).length > 0
                                        ? html`
                                            <div class="tool-calls">
                                              ${Object.values(
                                                message.tool_calls
                                              ).map(
                                                (toolCall) => html`
                                                  <div class="tool-call">
                                                    <div class="tool-name">
                                                      ${toolCall.tool_name}
                                                    </div>
                                                    <div class="tool-data">
                                                      <pre>
${JSON.stringify(toolCall.tool_args, null, 2)}</pre>
                                                    </div>
                                                    ${
                                                      toolCall.result
                                                        ? html`
                                                            <div
                                                              class="tool-data"
                                                            >
                                                              <pre>
${JSON.stringify(toolCall.result, null, 2)}</pre>
                                                            </div>
                                                          `
                                                        : nothing
                                                    }
                                                  </div>
                                                `
                                              )}
                                            </div>
                                          `
                                        : nothing
                                    }
                                  </div>
                                </div>
                              `
                            : nothing
                        }
                        ${
                          message.text
                            ? html`
                                <ha-markdown
                                  breaks
                                  cache
                                  .content=${message.text}
                                ></ha-markdown>
                              `
                            : nothing
                        }
                      </div>
                    `
                  : nothing
              }
            </div>
          `
        )}
      </div>
      <div class="input" slot="primaryAction">
        <ha-input
          id="message-input"
          @keyup=${this._handleKeyUp}
          @input=${this._handleInput}
          .label=${this._localize(`ui.dialogs.voice_command.input_label`)}
        >
          <div slot="end">
            ${
              this._showSendButton || !supportsSTT
                ? html`
                    <ha-icon-button
                      class="listening-icon"
                      .path=${mdiSend}
                      @click=${this._handleSendMessage}
                      .disabled=${this._processing}
                      .label=${this._localize(
                        "ui.dialogs.voice_command.send_text"
                      )}
                    >
                    </ha-icon-button>
                  `
                : html`
                    ${
                      this._audioRecorder?.active
                        ? html`
                            <div class="bouncer">
                              <div class="double-bounce1"></div>
                              <div class="double-bounce2"></div>
                            </div>
                          `
                        : nothing
                    }

                    <div class="listening-icon">
                      <ha-icon-button
                        .path=${mdiMicrophone}
                        @click=${this._handleListeningButton}
                        .disabled=${this._processing}
                        .label=${this._localize(
                          "ui.dialogs.voice_command.start_listening"
                        )}
                      >
                      </ha-icon-button>
                      ${
                        !supportsMicrophone
                          ? html`
                              <ha-svg-icon
                                .path=${mdiAlertCircle}
                                class="unsupported"
                              ></ha-svg-icon>
                            `
                          : null
                      }
                    </div>
                  `
            }
          </div>
        </ha-input>
      </div>
    `;
  }

  private async _scrollMessagesBottom() {
    const lastChatMessage = this._lastChatMessage;
    if (!lastChatMessage.hasUpdated) {
      await lastChatMessage.updateComplete;
    }
    if (
      this._lastChatMessageImage &&
      !this._lastChatMessageImage.naturalHeight
    ) {
      try {
        await this._lastChatMessageImage.decode();
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.warn("Failed to decode image:", err);
      }
    }
    const isLastMessageFullyVisible =
      lastChatMessage.getBoundingClientRect().y <
      this.getBoundingClientRect().top + 24;
    if (!isLastMessageFullyVisible) {
      lastChatMessage.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  private _handleKeyUp(ev: KeyboardEvent) {
    const input = ev.target as HaInput;
    if (!this._processing && ev.key === "Enter" && input.value) {
      this._processText(input.value);
      input.value = "";
      this._showSendButton = false;
    }
  }

  private _handleInput(ev: InputEvent) {
    const value = (ev.target as HaInput).value;
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

  private _handleToggleThinking(ev: Event) {
    const index = (ev.currentTarget as any).index;
    // Mutate the message in place rather than replacing it. The streaming
    // processor keeps a reference to this same object and mutates it as deltas
    // arrive; swapping in a new object would detach the in-flight message from
    // the processor and freeze the chat (see #52501).
    const message = this._conversation[index];
    message.thinking_expanded = !message.thinking_expanded;
    this.requestUpdate("_conversation");
  }

  private _addMessage(message: AssistMessage) {
    this._conversation = [...this._conversation!, message];
  }

  private _showNotSupportedMessage() {
    const documentationLink = `[${this._localize(
      "ui.components.secure_connection_required.documentation_link"
    )}](${documentationUrl(this._config, SECURE_CONNECTION_DOCUMENTATION_PATH)})`;
    this._addMessage({
      who: "hass",
      text: `${this._localize(
        "ui.components.secure_connection_required.microphone"
      )}\n\n${this._localize(
        "ui.components.secure_connection_required.learn_more",
        { documentation_link: documentationLink }
      )}`,
      thinking: "",
      tool_calls: {},
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

    const microphoneError = await this._audioRecorder.start();

    if (microphoneError) {
      this._audioBuffer = undefined;
      this._processing = false;
      this._addMessage({
        who: "hass",
        text: this._localize(
          `ui.dialogs.voice_command.microphone_${microphoneError}`
        ),
        thinking: "",
        tool_calls: {},
        error: true,
      });

      return;
    }

    const userMessage: AssistMessage = {
      who: "user",
      text: "…",
      thinking: "",
      tool_calls: {},
    };

    this._addMessage(userMessage);

    const hassMessageProcesser = this._createAddHassMessageProcessor();

    try {
      const unsub = await runAssistPipeline(
        this._connection,
        (event: PipelineRunEvent) => {
          if (event.type === "run-start") {
            this._stt_binary_handler_id =
              event.data.runner_data.stt_binary_handler_id;
            this._audio = new Audio(
              this._connection.hassUrl(event.data.tts_output!.url)
            );
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
              showAlertDialog(this, {
                title: this._localize(
                  "ui.dialogs.voice_command.error_playing_audio"
                ),
              });
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
            if (event.type === "intent-end") {
              this._conversationId = event.data.intent_output.conversation_id;
            }
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
        title: this._localize(
          "ui.dialogs.voice_command.error_starting_pipeline"
        ),
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
    this._connection.connection.socket!.binaryType = "arraybuffer";

    // eslint-disable-next-line eqeqeq
    if (this._stt_binary_handler_id == undefined) {
      return;
    }
    // Turn into 8 bit so we can prefix our handler ID.
    const data = new Uint8Array(1 + chunk.length * 2);
    data[0] = this._stt_binary_handler_id;
    data.set(new Uint8Array(chunk.buffer), 1);

    this._connection.connection.socket!.send(data);
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
    this._addMessage({ who: "user", text, thinking: "", tool_calls: {} });
    const hassMessageProcesser = this._createAddHassMessageProcessor();
    hassMessageProcesser.addMessage();
    try {
      const unsub = await runAssistPipeline(
        this._connection,
        (event) => {
          if (event.type.startsWith("intent-")) {
            hassMessageProcesser.processEvent(event);
            if (event.type === "intent-end") {
              this._conversationId = event.data.intent_output.conversation_id;
            }
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
        this._localize("ui.dialogs.voice_command.error")
      );
    } finally {
      this._processing = false;
    }
  }

  private _createAddHassMessageProcessor(): AssistMessageProcessor {
    return createAssistMessageProcessor({
      addMessage: (message) => this._addMessage(message),
      requestUpdate: () => this.requestUpdate("_conversation"),
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        :host {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        ha-alert {
          margin-bottom: var(--ha-space-2);
        }
        #message-input::part(wa-base) {
          padding-right: var(--ha-space-1);
        }

        .messages {
          flex: 1 1 400px;
          display: block;
          box-sizing: border-box;
          overflow-y: auto;
          min-height: 0;
          max-height: 100%;
          display: flex;
          flex-direction: column;
          padding: 0 var(--ha-space-3) var(--ha-space-4);
        }
        .input {
          padding: var(--ha-space-1) var(--ha-space-4) var(--ha-space-6);
        }
        .spacer {
          flex: 1;
        }
        .message-container {
          display: flex;
          flex-direction: column;
          margin: var(--ha-space-2) 0;
        }
        .message-container.user {
          align-self: flex-end;
        }
        .message-container.hass {
          align-self: flex-start;
        }
        .message {
          font-size: var(--ha-font-size-l);
          clear: both;
          max-width: -webkit-fill-available;
          overflow-wrap: break-word;
          scroll-margin-top: var(--ha-space-6);
          margin: var(--ha-space-2) 0;
          padding: var(--ha-space-2);
          border-radius: var(--ha-border-radius-xl);
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          .message {
            font-size: var(--ha-font-size-l);
          }
        }
        .message.user {
          margin-left: var(--ha-space-6);
          margin-inline-start: var(--ha-space-6);
          margin-inline-end: initial;
          align-self: flex-end;
          border-bottom-right-radius: 0px;
          --markdown-link-color: var(--text-primary-color);
          background-color: var(
            --chat-background-color-user,
            var(--primary-color)
          );
          color: var(--text-primary-color);
          direction: var(--direction);
        }
        .message.hass {
          margin-right: var(--ha-space-6);
          margin-inline-end: var(--ha-space-6);
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
        .message.error {
          background-color: var(--error-color);
          color: var(--text-primary-color);
        }
        .thinking-wrapper {
          margin: calc(var(--ha-space-2) * -1) calc(var(--ha-space-2) * -1) 0
            calc(var(--ha-space-2) * -1);
          overflow: hidden;
        }
        .thinking-wrapper:last-child {
          margin-bottom: calc(var(--ha-space-2) * -1);
        }
        .thinking-header {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          width: 100%;
          background: none;
          border: none;
          padding: var(--ha-space-2);
          cursor: pointer;
          text-align: left;
          color: var(--secondary-text-color);
          transition: color 0.2s;
        }
        .thinking-header:hover,
        .thinking-header:focus {
          outline: none;
          color: var(--primary-text-color);
        }
        .thinking-label {
          font-size: var(--ha-font-size-m);
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
        }
        .thinking-header ha-svg-icon {
          --mdc-icon-size: 16px;
        }
        .thinking-content {
          max-height: 0;
          overflow: hidden;
          transition:
            max-height 0.3s ease-in-out,
            padding 0.3s;
          padding: 0 var(--ha-space-2);
          font-size: var(--ha-font-size-m);
          color: var(--secondary-text-color);
        }
        .thinking-wrapper.expanded .thinking-content {
          max-height: 500px;
          padding: var(--ha-space-2);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
        }
        .tool-calls {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-1);
        }
        .tool-call {
          padding: var(--ha-space-1) var(--ha-space-2);
          border-left: 2px solid var(--divider-color);
          margin-bottom: var(--ha-space-1);
        }
        .tool-name {
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: var(--ha-space-1);
        }
        .tool-data {
          font-family: var(--code-font-family, monospace);
          font-size: 0.9em;
          background: var(--markdown-code-background-color);
          padding: var(--ha-space-1);
          border-radius: var(--ha-border-radius-s);
          margin-top: var(--ha-space-1);
          overflow-x: auto;
        }
        .tool-data pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-all;
        }
        ha-markdown {
          --markdown-image-border-radius: calc(var(--ha-border-radius-xl) / 2);
          --markdown-table-border-color: var(--divider-color);
          --markdown-code-background-color: var(--primary-background-color);
          --markdown-code-text-color: var(--primary-text-color);
          --markdown-list-indent: 1.15em;
        }
        ha-markdown:not(:has(ha-markdown-element)) {
          min-height: 1lh;
          min-width: 1lh;
          flex-shrink: 0;
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
          border-radius: var(--ha-border-radius-circle);
          background-color: var(--primary-color);
          opacity: 0.2;
          position: absolute;
          top: 0;
          left: 0;
          animation: sk-bounce 2s infinite ease-in-out;
        }
        .double-bounce2 {
          animation-delay: -1s;
        }
        @keyframes sk-bounce {
          0%,
          100% {
            transform: scale(0);
          }
          50% {
            transform: scale(1);
          }
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-assist-chat": HaAssistChat;
  }
}
