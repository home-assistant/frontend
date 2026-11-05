import { mdiStarFourPoints } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";

import { customElement, property, query, state } from "lit/decorators";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import type { GenDataTask, GenDataTaskResult } from "../data/ai_task";
import { AITaskController } from "../data/ai_task_controller";
import "./chips/ha-assist-chip";
import "./ha-svg-icon";

declare global {
  interface HASSDomEvents {
    suggestion: GenDataTaskResult;
  }
}

export interface SuggestWithAIGenerateTask {
  type: "data";
  task: GenDataTask;
}

@customElement("ha-suggest-with-ai-button")
export class HaSuggestWithAIButton extends LitElement {
  @property({ attribute: "task-type" })
  public taskType!: "data";

  @property({ attribute: false })
  generateTask!: () => SuggestWithAIGenerateTask;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  private _aiTask = new AITaskController(this);

  @state()
  private _state: {
    status: "idle" | "suggesting" | "error" | "done";
    suggestionIndex: 1 | 2 | 3;
  } = {
    status: "idle",
    suggestionIndex: 1,
  };

  @state()
  private _minWidth?: string;

  @query("ha-assist-chip") private _chip?: HTMLElement & {
    offsetWidth: number;
  };

  private _intervalId?: number;

  render() {
    if (!this._aiTask.canGenerateData) {
      return nothing;
    }

    let label: string;
    switch (this._state.status) {
      case "error":
        label = this._localize("ui.components.suggest_with_ai.error");
        break;
      case "done":
        label = this._localize("ui.components.suggest_with_ai.done");
        break;
      case "suggesting":
        label = this._localize(
          `ui.components.suggest_with_ai.suggesting_${this._state.suggestionIndex}`
        );
        break;
      default:
        label = this._localize("ui.components.suggest_with_ai.label");
    }

    return html`
      <ha-assist-chip
        @click=${this._suggest}
        .label=${label}
        ?active=${this._state.status === "suggesting"}
        class=${
          this._state.status === "error"
            ? "error"
            : this._state.status === "done"
              ? "done"
              : ""
        }
        style=${this._minWidth ? `min-width: ${this._minWidth}` : ""}
      >
        <ha-svg-icon slot="icon" .path=${mdiStarFourPoints}></ha-svg-icon>
      </ha-assist-chip>
    `;
  }

  private async _suggest() {
    if (!this.generateTask || this._state.status === "suggesting") {
      return;
    }

    // Capture current width before changing state
    if (this._chip) {
      this._minWidth = `${this._chip.offsetWidth}px`;
    }

    // Reset to suggesting state
    this._state = {
      status: "suggesting",
      suggestionIndex: 1,
    };

    try {
      // Start cycling through suggestion texts
      this._intervalId = window.setInterval(() => {
        this._state = {
          ...this._state,
          suggestionIndex: ((this._state.suggestionIndex % 3) + 1) as 1 | 2 | 3,
        };
      }, 3000);

      const info = await this.generateTask();
      let result: GenDataTaskResult;
      if (info.type === "data") {
        result = await this._aiTask.generateData(info.task);
      } else {
        throw new Error("Unsupported task type");
      }

      fireEvent(this, "suggestion", result);

      // Show success state
      this._state = {
        ...this._state,
        status: "done",
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error generating AI suggestion:", error);

      this._state = {
        ...this._state,
        status: "error",
      };
    } finally {
      if (this._intervalId) {
        clearInterval(this._intervalId);
        this._intervalId = undefined;
      }
      setTimeout(() => {
        this._state = {
          ...this._state,
          status: "idle",
        };
        this._minWidth = undefined;
      }, 3000);
    }
  }

  static styles = css`
    ha-assist-chip[active] {
      animation: pulse-glow 1.5s ease-in-out infinite;
    }

    ha-assist-chip.error {
      box-shadow: 0 0 12px 4px rgba(var(--rgb-error-color), 0.8);
    }

    ha-assist-chip.done {
      box-shadow: 0 0 12px 4px rgba(var(--rgb-primary-color), 0.8);
    }

    @keyframes pulse-glow {
      0% {
        box-shadow: 0 0 0 0 rgba(var(--rgb-primary-color), 0);
      }
      50% {
        box-shadow: 0 0 8px 2px rgba(var(--rgb-primary-color), 0.6);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(var(--rgb-primary-color), 0);
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-suggest-with-ai-button": HaSuggestWithAIButton;
  }
}
