import {
  mdiAlertCircleOutline,
  mdiPlus,
  mdiPlusMinusVariant,
  mdiCheckCircleOutline,
  mdiSend,
  mdiStarFourPoints,
  mdiStop,
} from "@mdi/js";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import "../../../../components/ha-alert";
import "../../../../components/ha-action-bar";
import "../../../../components/ha-button";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-markdown";
import "../../../../components/ha-spinner";
import "../../../../components/ha-svg-icon";
import type { AutomationConfig } from "../../../../data/automation";
import { labelsContext } from "../../../../data/context";
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
import type { LineChanges } from "./automation-ai-stats";
import "./ha-automation-ai-prompt";
import type { HaAutomationAiPrompt } from "./ha-automation-ai-prompt";

// The squares next to the numbers of changed lines, like a git diff
const STAT_SQUARES = 5;

interface RunningTurn {
  prompt: string;
  steps: AutomationAiStep[];
}

/**
 * @summary Lets the user ask the AI to change the automation and follow
 * what it does, in a tab of the sidebar of the automation. The editor applies
 * the changes and can show them.
 *
 * @fires ai-request-started - The AI started to work on a request
 * @fires ai-request-finished - The AI is done, with the new config if any
 * @fires ai-toggle-changes - Show or hide the last changes of the AI
 */
@customElement("ha-automation-ai-panel")
export class HaAutomationAiPanel extends LitElement {
  // Runs the agent, which reads states, registries and services and calls
  // the backend
  @property({ attribute: false }) public hass!: HomeAssistant;

  /** The config the next request changes. */
  @property({ attribute: false }) public config!: AutomationConfig;

  /** Whether the last request of the AI changed the automation. */
  @property({ type: Boolean }) public changes = false;

  /** Whether the editor shows the last changes of the AI. */
  @property({ type: Boolean, attribute: "showing-changes" })
  public showingChanges = false;

  /** The lines of YAML the last request of the AI added and removed. */
  @property({ attribute: false }) public lineChanges?: LineChanges;

  @state() private _prompt = "";

  // Counts the requests, so a stopped one leaves no trace when it finishes
  private _request = 0;

  // The conversation before the running request, to go back to on stop
  private _baseSteps: AutomationAiStep[] = [];

  private _baseMessages: AutomationAiMessage[] = [];

  @state() private _turns: AutomationAiTurn[] = [];

  @state() private _running?: RunningTurn;

  @state() private _steps: AutomationAiStep[] = [];

  @state() private _messages: AutomationAiMessage[] = [];

  @state() private _problems: string[] = [];

  @state() private _error?: string;

  @query(".content") private _content?: HTMLElement;

  @query("ha-automation-ai-prompt")
  private _promptEditor?: HaAutomationAiPrompt;

  @query("ha-target-picker") private _targetPicker?: HaTargetPicker;

  // For the names of picked labels, the other names are in hass
  @consume({ context: labelsContext, subscribe: true })
  private _labels?: LabelRegistryEntry[];

  protected render(): TemplateResult {
    return html`
      <div class="content">
        ${this._renderEmpty()}
        ${this._turns.map((turn) => this._renderTurn(turn))}
        ${this._running ? this._renderRunning(this._running) : nothing}
        ${this._renderResult()} ${this._renderConversation()}
      </div>
      ${this._renderPrompt()}
    `;
  }

  /** Puts the cursor in the prompt, e.g. when the AI opens. */
  public async focusPrompt() {
    await this.updateComplete;
    await this._promptEditor?.updateComplete;
    this._promptEditor?.focus();
  }

  private _renderPromptText(prompt: string) {
    return promptParts(prompt).map((part) =>
      typeof part === "string"
        ? part
        : html`<span class="mention">${part.label}</span>`
    );
  }

  private async _stop() {
    const stop = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.ai.stop.title"
      ),
      text: html`<ha-alert alert-type="info">
        ${this.hass.localize("ui.panel.config.automation.editor.ai.stop.info")}
      </ha-alert>`,
      confirmText: this.hass.localize(
        "ui.panel.config.automation.editor.ai.stop.confirm"
      ),
      dismissText: this.hass.localize(
        "ui.panel.config.automation.editor.ai.stop.dismiss"
      ),
    });
    const running = this._running;
    if (!stop || !running) {
      return;
    }
    // The backend finishes the request, its result is dropped
    this._request++;
    this._steps = this._baseSteps;
    this._messages = this._baseMessages;
    this._running = undefined;
    this._prompt = running.prompt;
    fireEvent(this, "ai-request-finished", {});
  }

  // Before the first request, an invitation in the middle
  private _renderEmpty() {
    if (this._turns.length || this._running || this._error) {
      return nothing;
    }
    return html`<div class="empty">
      <ha-svg-icon .path=${mdiStarFourPoints}></ha-svg-icon>
      <p>${this.hass.localize("ui.panel.config.automation.editor.ai.empty")}</p>
    </div>`;
  }

  private _renderTurn(turn: AutomationAiTurn) {
    return html`
      <div class="message user">${this._renderPromptText(turn.prompt)}</div>
      <ha-markdown
        class="message assistant"
        breaks
        .content=${turn.summary}
      ></ha-markdown>
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
            ? html`<ha-spinner></ha-spinner>`
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
        this._turns.length && !this.changes
          ? html`<ha-alert alert-type="info">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.ai.no_changes"
              )}
            </ha-alert>`
          : nothing
      }
      ${
        this._problems.length
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

  // Actions on the last result of the AI, above the prompt
  private _renderActions() {
    if (!this.changes || this._running) {
      return nothing;
    }
    return html`<ha-action-bar>
      <ha-button
        size="s"
        variant=${this.showingChanges ? "brand" : "neutral"}
        appearance=${this.showingChanges ? "filled" : "outlined"}
        aria-pressed=${this.showingChanges ? "true" : "false"}
        @click=${this._toggleChanges}
      >
        <ha-svg-icon slot="start" .path=${mdiPlusMinusVariant}></ha-svg-icon>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.ai.changes_button"
        )}
      </ha-button>
      ${this._renderLineChanges()}
    </ha-action-bar>`;
  }

  // Like a git diff: the numbers, and five squares in their proportion
  private _renderLineChanges() {
    const stats = this.lineChanges;
    const total = stats ? stats.added + stats.removed : 0;
    if (!stats || !total) {
      return nothing;
    }
    const colored = Math.min(STAT_SQUARES, total);
    const added = Math.round((colored * stats.added) / total);
    const squares = [
      ...Array<string>(added).fill("added"),
      ...Array<string>(colored - added).fill("removed"),
      ...Array<string>(STAT_SQUARES - colored).fill("neutral"),
    ];
    return html`<span
      class="line-changes"
      role="img"
      aria-label=${this.hass.localize(
        "ui.panel.config.automation.editor.ai.line_changes",
        { added: stats.added, removed: stats.removed }
      )}
    >
      <span class="added" aria-hidden="true">+${stats.added}</span>
      <span class="removed" aria-hidden="true">−${stats.removed}</span>
      <span class="squares" aria-hidden="true">
        ${squares.map((square) => html`<span class=${square}></span>`)}
      </span>
    </span>`;
  }

  private _renderPrompt() {
    const followUp = this._turns.length > 0;
    return html`
      ${this._renderActions()}
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
          .placeholder=${this.hass.localize(
            `ui.panel.config.automation.editor.ai.${followUp ? "follow_up_placeholder" : "prompt_placeholder"}`
          )}
          .value=${this._prompt}
          @value-changed=${this._promptChanged}
          @prompt-submit=${this._submit}
          @pick-target=${this._pickTarget}
        ></ha-automation-ai-prompt>
        ${
          this._running
            ? html`<ha-icon-button
                .label=${this.hass.localize(
                  "ui.panel.config.automation.editor.ai.stop.label"
                )}
                .path=${mdiStop}
                @click=${this._stop}
              ></ha-icon-button>`
            : html`<ha-icon-button
                .label=${this.hass.localize(
                  "ui.panel.config.automation.editor.ai.send"
                )}
                .path=${mdiSend}
                .disabled=${!!this._running || !this._prompt.trim()}
                @click=${this._submit}
              ></ha-icon-button>`
        }
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
    this._baseSteps = baseSteps;
    this._baseMessages = baseMessages;
    const request = ++this._request;
    const current = () => request === this._request;
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
          if (!current()) {
            return;
          }
          this._steps = [...baseSteps, ...steps];
          this._running = { prompt, steps };
          this._scrollToEnd();
        },
        onMessages: (messages) => {
          if (!current()) {
            return;
          }
          this._messages = [...baseMessages, ...messages];
        },
      });
      if (!current()) {
        return;
      }
      config = result.config;
      this._problems = result.problems;
      this._turns = [...this._turns, { prompt, summary: result.summary }];
    } catch (err) {
      if (!current()) {
        return;
      }
      this._error =
        (err as { message?: string } | undefined)?.message ?? String(err);
      // Let the user send the request again
      this._prompt = prompt;
    }
    this._running = undefined;
    fireEvent(this, "ai-request-finished", { config });
    this._scrollToEnd();
  }

  private async _scrollToEnd() {
    await this.updateComplete;
    this._content?.scrollTo({ top: this._content.scrollHeight });
  }

  private _toggleChanges() {
    fireEvent(this, "ai-toggle-changes");
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
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
    .steps li ha-svg-icon {
      --mdc-icon-size: 20px;
      flex-shrink: 0;
    }
    /* As big as the icons, a narrower box made it wobble while it spins */
    .steps li ha-spinner {
      --ha-spinner-size: 20px;
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
    ha-action-bar {
      flex-shrink: 0;
    }
    .empty {
      margin: auto;
      padding: var(--ha-space-4);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ha-space-3);
      text-align: center;
      color: var(--secondary-text-color);
    }
    .empty ha-svg-icon {
      --mdc-icon-size: 40px;
      color: var(--secondary-text-color);
      fill: var(--secondary-text-color);
    }
    .empty p {
      margin: 0;
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-condensed);
    }
    /* Next to the button, which shows these changes */
    .line-changes {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
      font-variant-numeric: tabular-nums;
    }
    .line-changes .added {
      color: var(--ha-color-on-success-normal);
    }
    .line-changes .removed {
      color: var(--ha-color-on-danger-normal);
    }
    .squares {
      display: flex;
      gap: 2px;
    }
    .squares span {
      width: 8px;
      height: 8px;
      border-radius: 2px;
      background-color: var(--ha-color-fill-neutral-normal-resting);
    }
    .squares .added {
      background-color: var(--ha-color-fill-success-loud-resting);
    }
    .squares .removed {
      background-color: var(--ha-color-fill-danger-loud-resting);
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
    "ha-automation-ai-panel": HaAutomationAiPanel;
  }

  interface HASSDomEvents {
    "ai-request-started": undefined;
    "ai-request-finished": { config?: AutomationConfig };
    "ai-toggle-changes": undefined;
  }
}
