import {
  mdiAlertCircleOutline,
  mdiCheck,
  mdiPlus,
  mdiCheckCircleOutline,
  mdiChevronDown,
  mdiChevronUp,
  mdiClose,
  mdiSend,
  mdiStarFourPoints,
} from "@mdi/js";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-markdown";
import "../../../../components/ha-snap-bottom-sheet";
import type {
  BottomSheetPosition,
  HaSnapBottomSheet,
} from "../../../../components/ha-snap-bottom-sheet";
import "../../../../components/ha-spinner";
import "../../../../components/ha-svg-icon";
import type { AutomationConfig } from "../../../../data/automation";
import { labelsContext, narrowViewportContext } from "../../../../data/context";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import { ensureArray } from "../../../../common/array/ensure-array";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import "../../../../components/ha-target-picker";
import type { HaTargetPicker } from "../../../../components/ha-target-picker";
import type { ValueChangedEvent, HomeAssistant } from "../../../../types";
import type {
  AutomationAiMention,
  AutomationAiMessage,
  AutomationAiStep,
  AutomationAiTurn,
} from "./automation-ai-agent";
import { runAutomationAi } from "./automation-ai-agent";
import {
  promptMentions,
  promptParts,
  promptText,
} from "./automation-ai-mentions";
import "./ha-automation-ai-prompt";
import type { HaAutomationAiPrompt } from "./ha-automation-ai-prompt";

// The strip the collapsed sheet keeps visible until the header is measured
const COLLAPSED_HEIGHT = 85;

interface RunningTurn {
  prompt: string;
  steps: AutomationAiStep[];
}

/**
 * @summary Lets the user ask the AI to change the automation and follow
 * what it does. The editor shows the changes and applies them on accept.
 *
 * @fires ai-request-started - The AI started to work on a request
 * @fires ai-request-finished - The AI is done, with the new config if any
 * @fires ai-accept - The user accepted the changes
 * @fires ai-decline - The user declined the changes
 * @fires ai-sheet-closed - The sheet closed
 */
@customElement("ha-automation-ai-sheet")
export class HaAutomationAiSheet extends LitElement {
  // Runs the agent, which reads states, registries and services and calls
  // the backend
  @property({ attribute: false }) public hass!: HomeAssistant;

  /** The config the next request changes. */
  @property({ attribute: false }) public config!: AutomationConfig;

  /** Whether the editor shows changes of the AI the user hasn't decided on. */
  @property({ type: Boolean }) public reviewing = false;

  /** Whether the AI changed anything in the config it shows. */
  @property({ type: Boolean, attribute: "has-changes" }) public hasChanges =
    false;

  /** Hides the sheet without losing its state, e.g. for another sheet. */
  @property({ type: Boolean }) public suspended = false;

  @state()
  @consume({ context: narrowViewportContext, subscribe: true })
  private _narrow = false;

  // The collapsed sheet keeps the whole header visible
  @state() private _headerHeight?: number;

  @query(".header") private _header?: HTMLElement;

  @state() private _prompt = "";

  @state() private _turns: AutomationAiTurn[] = [];

  @state() private _running?: RunningTurn;

  @state() private _steps: AutomationAiStep[] = [];

  @state() private _messages: AutomationAiMessage[] = [];

  @state() private _problems: string[] = [];

  @state() private _error?: string;

  @state() private _collapsed = false;

  @query("ha-snap-bottom-sheet") private _sheet?: HaSnapBottomSheet;

  @query(".content") private _content?: HTMLElement;

  @query("ha-automation-ai-prompt")
  private _promptEditor?: HaAutomationAiPrompt;

  @query("ha-target-picker") private _targetPicker?: HaTargetPicker;

  // For the names of picked labels, the other names are in hass
  @consume({ context: labelsContext, subscribe: true })
  private _labels?: LabelRegistryEntry[];

  // Where the sheet rests, so it comes back there after it was suspended
  private _position: BottomSheetPosition = "half";

  // Set when a request returned changes, until the editor shows them
  private _collapseForReview = false;

  // Only when the sheet opens, not when it comes back after being suspended
  private _autofocusPrompt = true;

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._autofocusPrompt = false;
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    const headerHeight = this._header?.offsetHeight;
    if (headerHeight && headerHeight !== this._headerHeight) {
      this._headerHeight = headerHeight;
    }
    if (
      changedProps.has("suspended") &&
      changedProps.get("suspended") &&
      !this.suspended
    ) {
      this._sheet?.snapTo(this._position);
    }
    // Out of the way, so the user can review the changes
    if (this._collapseForReview && this.reviewing) {
      this._collapseForReview = false;
      if (this.hasChanges) {
        this._sheet?.snapTo("collapsed");
      }
    }
  }

  protected render(): TemplateResult | typeof nothing {
    // The state stays here while the sheet is hidden, so it comes back as it was
    if (this.suspended) {
      return nothing;
    }
    return html`
      <ha-snap-bottom-sheet
        .minHeight=${this._headerHeight ?? COLLAPSED_HEIGHT}
        .label=${this.hass.localize("ui.panel.config.automation.editor.ai.title")}
        @bottom-sheet-resized=${this._sheetResized}
        @bottom-sheet-closed=${this._sheetClosed}
      >
        <div class="sheet">
          ${this._renderHeader()}
          <div class="content">
            ${this._turns.map((turn) => this._renderTurn(turn))}
            ${this._running ? this._renderRunning(this._running) : nothing}
            ${this._renderResult()} ${this._renderConversation()}
          </div>
          ${this._renderPrompt()}
        </div>
      </ha-snap-bottom-sheet>
    `;
  }

  private _renderHeader() {
    const status = this._running
      ? "running"
      : this._error && !this.reviewing
        ? "error"
        : this.reviewing
          ? "review"
          : "idle";
    return html`
      <div class="header ${this._narrow ? "" : "has-toggle"}">
        ${
          // On narrow screens people drag bottom sheets
          this._narrow
            ? nothing
            : html`<ha-icon-button
                class="toggle"
                .label=${this.hass.localize(
                  `ui.panel.config.automation.editor.ai.${this._collapsed ? "expand" : "collapse"}`
                )}
                .path=${this._collapsed ? mdiChevronUp : mdiChevronDown}
                @click=${this._toggleCollapsed}
              ></ha-icon-button>`
        }
        <ha-svg-icon class="ai-icon" .path=${mdiStarFourPoints}></ha-svg-icon>
        <div class="title">
          <span class="name"
            >${this.hass.localize(
              "ui.panel.config.automation.editor.ai.title"
            )}</span
          >
          <span class="status"
            >${this.hass.localize(
              `ui.panel.config.automation.editor.ai.status_${status}`
            )}</span
          >
        </div>
        ${
          this.reviewing && !this._running
            ? html`
                <ha-icon-button
                  class="decline"
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.ai.decline"
                  )}
                  .path=${mdiClose}
                  @click=${this._decline}
                ></ha-icon-button>
                <ha-icon-button
                  class="accept"
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.ai.accept"
                  )}
                  .path=${mdiCheck}
                  .disabled=${!this.hasChanges}
                  @click=${this._accept}
                ></ha-icon-button>
              `
            : nothing
        }
        ${
          !this.reviewing && !this._running
            ? html`<ha-icon-button
                .label=${this.hass.localize(
                  "ui.panel.config.automation.editor.ai.close"
                )}
                .path=${mdiClose}
                @click=${this._close}
              ></ha-icon-button>`
            : nothing
        }
      </div>
    `;
  }

  private _renderPromptText(prompt: string) {
    return promptParts(prompt).map((part) =>
      typeof part === "string"
        ? part
        : html`<span class="mention">${part.label}</span>`
    );
  }

  private _renderTurn(turn: AutomationAiTurn) {
    return html`
      <div class="message user">${this._renderPromptText(turn.prompt)}</div>
      <ha-markdown
        class="message assistant"
        breaks
        .content=${turn.summary}
      ></ha-markdown>
      ${
        turn.declined
          ? html`<div class="declined">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.ai.declined"
              )}
            </div>`
          : nothing
      }
    `;
  }

  private _renderRunning(turn: RunningTurn) {
    return html`
      <div class="message user">${this._renderPromptText(turn.prompt)}</div>
      <ul class="steps" aria-live="polite">
        ${turn.steps.map((step) => this._renderStep(step))}
      </ul>
    `;
  }

  private _renderStep(step: AutomationAiStep) {
    const key =
      step.status === "running"
        ? `${step.type}_running`
        : step.status === "error"
          ? `${step.type}_error`
          : step.type;
    return html`
      <li class=${step.status}>
        ${
          step.status === "running"
            ? html`<ha-spinner size="tiny"></ha-spinner>`
            : html`<ha-svg-icon
                .path=${
                  step.status === "error"
                    ? mdiAlertCircleOutline
                    : mdiCheckCircleOutline
                }
              ></ha-svg-icon>`
        }
        ${this.hass.localize(
          `ui.panel.config.automation.editor.ai.steps.${key}` as Parameters<
            HomeAssistant["localize"]
          >[0],
          { count: step.problems ?? 0 }
        )}
      </li>
    `;
  }

  private _renderResult() {
    if (this._running) {
      return nothing;
    }
    return html`
      ${
        this._error
          ? html`<ha-alert alert-type="error">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.ai.error",
                {
                  error: this._error,
                }
              )}
            </ha-alert>`
          : nothing
      }
      ${
        this.reviewing && !this.hasChanges
          ? html`<ha-alert alert-type="info">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.ai.no_changes"
              )}
            </ha-alert>`
          : nothing
      }
      ${
        this.reviewing && this._problems.length
          ? html`<ha-alert alert-type="warning">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.ai.problems"
              )}
              <ul>
                ${this._problems.map((problem) => html`<li>${problem}</li>`)}
              </ul>
            </ha-alert>`
          : nothing
      }
    `;
  }

  private _renderConversation() {
    if (!this._steps.length && !this._messages.length) {
      return nothing;
    }
    return html`
      <ha-expansion-panel
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.automation.editor.ai.show_conversation"
        )}
      >
        <ul class="steps">
          ${this._steps.map((step) => this._renderStep(step))}
        </ul>
        ${this._messages.map(
          (message) => html`
            <ha-expansion-panel
              class="conversation-message"
              .header=${this.hass.localize(
                `ui.panel.config.automation.editor.ai.role_${message.role}`
              )}
              .expanded=${message.role === "assistant"}
            >
              ${
                message.thinking
                  ? html`<ha-expansion-panel
                      .header=${this.hass.localize(
                        "ui.panel.config.automation.editor.ai.thinking"
                      )}
                    >
                      <pre>${message.thinking}</pre>
                    </ha-expansion-panel>`
                  : nothing
              }
              <pre>${message.content}</pre>
            </ha-expansion-panel>
          `
        )}
      </ha-expansion-panel>
    `;
  }

  private _renderPrompt() {
    const followUp = this._turns.length > 0;
    return html`
      <form class="prompt" @submit=${this._submit}>
        <ha-target-picker custom-field @value-changed=${this._targetPicked}>
          <ha-icon-button
            slot="field"
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.ai.add_target"
            )}
            .path=${mdiPlus}
            @click=${this._openTargetPicker}
          ></ha-icon-button>
        </ha-target-picker>
        <ha-automation-ai-prompt
          .focusOnOpen=${this._autofocusPrompt}
          .placeholder=${this.hass.localize(
            `ui.panel.config.automation.editor.ai.${followUp ? "follow_up_placeholder" : "prompt_placeholder"}`
          )}
          .value=${this._prompt}
          @value-changed=${this._promptChanged}
          @prompt-submit=${this._submit}
          @pick-target=${this._pickTarget}
        ></ha-automation-ai-prompt>
        <ha-icon-button
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.ai.send"
          )}
          .path=${mdiSend}
          .disabled=${!!this._running || !this._prompt.trim()}
          @click=${this._submit}
        ></ha-icon-button>
      </form>
    `;
  }

  private _promptChanged(ev: ValueChangedEvent<string>) {
    this._prompt = ev.detail.value;
  }

  private _openTargetPicker(ev: Event) {
    // The click would close the picker again as a click outside of it
    ev.stopPropagation();
    this._targetPicker?.open();
  }

  private _pickTarget(ev: HASSDomEvent<HASSDomEvents["pick-target"]>) {
    this._targetPicker?.open(ev.detail.section);
  }

  private async _targetPicked(ev: ValueChangedEvent<HassServiceTarget>) {
    ev.stopPropagation();
    const mention = this._mentionFor(ev.detail.value);
    if (!mention) {
      return;
    }
    this._promptEditor?.insertMention(mention);
  }

  private _mentionFor(
    target: HassServiceTarget | undefined
  ): AutomationAiMention | undefined {
    const [key, ids] =
      Object.entries(target ?? {}).find(([, value]) => value?.length) ?? [];
    const id = ids ? ensureArray(ids)[0] : undefined;
    if (!key || !id) {
      return undefined;
    }
    const { states, devices, areas, floors } = this.hass;
    const label =
      key === "entity_id"
        ? states[id]?.attributes.friendly_name
        : key === "device_id"
          ? devices[id] && computeDeviceName(devices[id])
          : key === "area_id"
            ? areas[id]?.name
            : key === "floor_id"
              ? floors[id]?.name
              : this._labels?.find((label_) => label_.label_id === id)?.name;
    return { label: label?.trim() || id, key, id };
  }

  private async _submit(ev?: Event) {
    ev?.preventDefault();
    const prompt = this._prompt.trim();
    if (!prompt || this._running) {
      return;
    }
    this._prompt = "";
    this._error = undefined;
    this._problems = [];
    this._running = { prompt, steps: [] };
    // Steps and messages of earlier requests stay in the conversation
    const baseSteps = this._steps;
    const baseMessages = this._messages;
    this._expand();
    fireEvent(this, "ai-request-started");

    let config: AutomationConfig | undefined;
    try {
      const result = await runAutomationAi({
        hass: this.hass,
        config: this.config,
        prompt: promptText(prompt),
        mentions: promptMentions(prompt),
        history: this._turns.map((turn) => ({
          ...turn,
          prompt: promptText(turn.prompt),
        })),
        onStep: (steps) => {
          this._steps = [...baseSteps, ...steps];
          this._running = { prompt, steps };
          this._scrollToEnd();
        },
        onMessages: (messages) => {
          this._messages = [...baseMessages, ...messages];
        },
      });
      config = result.config;
      this._collapseForReview = true;
      this._problems = result.problems;
      this._turns = [...this._turns, { prompt, summary: result.summary }];
    } catch (err) {
      this._error =
        (err as { message?: string } | undefined)?.message ?? String(err);
      // Let the user send the request again
      this._prompt = prompt;
    } finally {
      this._running = undefined;
      fireEvent(this, "ai-request-finished", { config });
      this._scrollToEnd();
    }
  }

  private async _scrollToEnd() {
    await this.updateComplete;
    this._content?.scrollTo({ top: this._content.scrollHeight });
  }

  private _sheetResized() {
    this._position = this._sheet?.position ?? this._position;
    this._collapsed = this._position === "collapsed";
  }

  private _expand() {
    if (this._sheet?.position === "collapsed") {
      this._sheet.snapTo("half");
    }
  }

  private _toggleCollapsed() {
    this._sheet?.snapTo(this._collapsed ? "half" : "collapsed");
  }

  private _accept() {
    fireEvent(this, "ai-accept");
    this._sheet?.closeSheet();
  }

  // Keeps the sheet open, so the user can ask for something else
  private _decline() {
    fireEvent(this, "ai-decline");
    this._turns = this._turns.map((turn) => ({ ...turn, declined: true }));
    this._problems = [];
    this._sheet?.snapTo("half");
    this._promptEditor?.focus();
  }

  private _close() {
    this._sheet?.closeSheet();
  }

  private _sheetClosed() {
    fireEvent(this, "ai-sheet-closed");
  }

  static styles = css`
    :host {
      /* Centers the sheet on wide screens */
      --ha-bottom-sheet-inset-left: max(
        var(--safe-area-inset-left, 0px),
        calc((100vw - 720px) / 2)
      );
      --ha-bottom-sheet-inset-right: max(
        var(--safe-area-inset-right, 0px),
        calc((100vw - 720px) / 2)
      );
      --ha-bottom-sheet-handle-padding: var(--ha-space-2);
    }
    .sheet {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .header {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      padding: var(--ha-space-5) var(--ha-space-2) var(--ha-space-4)
        var(--ha-space-4);
      border-bottom: 1px solid var(--divider-color);
      flex-shrink: 0;
    }
    .accept,
    .decline {
      border-radius: var(--ha-border-radius-circle);
    }
    .accept {
      color: var(--ha-color-on-success-normal);
      background-color: var(--ha-color-fill-success-normal-resting);
    }
    .decline {
      color: var(--ha-color-on-danger-normal);
      background-color: var(--ha-color-fill-danger-normal-resting);
    }
    @media (hover: hover) {
      .accept:hover:not([disabled]) {
        background-color: var(--ha-color-fill-success-normal-hover);
      }
      .decline:hover {
        background-color: var(--ha-color-fill-danger-normal-hover);
      }
    }
    .accept[disabled] {
      color: var(--ha-color-on-disabled-normal);
      background-color: var(--ha-color-fill-disabled-normal-resting);
    }
    /* The toggle's own padding is enough space to the edge */
    .header.has-toggle {
      padding-inline-start: var(--ha-space-1);
    }
    .toggle {
      color: var(--secondary-text-color);
    }
    .ai-icon {
      color: var(--primary-color);
      flex-shrink: 0;
    }
    .title {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .name {
      font-weight: var(--ha-font-weight-medium);
    }
    .status {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: var(--ha-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-3);
    }
    /* Like the messages in the Assist chat */
    .message {
      max-width: 85%;
      padding: var(--ha-space-2);
      border-radius: var(--ha-border-radius-xl);
      overflow-wrap: break-word;
      white-space: pre-wrap;
      direction: var(--direction);
    }
    .message.user {
      align-self: flex-end;
      border-end-end-radius: 0;
      --markdown-link-color: var(--text-primary-color);
      background-color: var(--chat-background-color-user, var(--primary-color));
      color: var(--text-primary-color);
    }
    .message.assistant {
      align-self: flex-start;
      border-end-start-radius: 0;
      background-color: var(
        --chat-background-color-hass,
        var(--secondary-background-color)
      );
      color: var(--primary-text-color);
      white-space: normal;
    }
    .message .mention {
      padding: 0 var(--ha-space-2);
      border-radius: var(--ha-border-radius-pill);
      background-color: rgba(255, 255, 255, 0.25);
      font-weight: var(--ha-font-weight-medium);
    }
    .declined {
      align-self: flex-start;
      margin-top: calc(var(--ha-space-2) * -1);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
    .steps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
      color: var(--secondary-text-color);
    }
    .steps li {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
    }
    .steps li ha-svg-icon,
    .steps li ha-spinner {
      --mdc-icon-size: 20px;
      width: 20px;
      flex-shrink: 0;
    }
    .steps li.done ha-svg-icon {
      color: var(--ha-color-on-success-quiet);
    }
    .steps li.error ha-svg-icon {
      color: var(--ha-color-on-warning-quiet);
    }
    ha-expansion-panel {
      --expansion-panel-content-padding: 0 var(--ha-space-2);
    }
    ha-expansion-panel .steps {
      margin: var(--ha-space-2) 0;
    }
    .conversation-message {
      margin-bottom: var(--ha-space-2);
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--ha-font-family-code);
      font-size: var(--ha-font-size-s);
      margin: 0 0 var(--ha-space-2);
      max-height: 320px;
      overflow-y: auto;
    }
    .prompt {
      display: flex;
      align-items: flex-end;
      gap: var(--ha-space-1);
      padding: var(--ha-space-2) var(--ha-space-2) var(--ha-space-3)
        var(--ha-space-4);
      padding-bottom: calc(
        var(--ha-space-3) + var(--safe-area-inset-bottom, 0px)
      );
      border-top: 1px solid var(--divider-color);
      flex-shrink: 0;
    }
    .prompt ha-target-picker {
      flex-shrink: 0;
      --ha-generic-picker-width: 360px;
    }
    .prompt ha-automation-ai-prompt {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-ai-sheet": HaAutomationAiSheet;
  }

  interface HASSDomEvents {
    "ai-request-started": undefined;
    "ai-request-finished": { config?: AutomationConfig };
    "ai-accept": undefined;
    "ai-decline": undefined;
    "ai-sheet-closed": undefined;
  }
}
