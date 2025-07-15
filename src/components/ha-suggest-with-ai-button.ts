import type { PropertyValues } from "lit";
import { html, css, LitElement, nothing } from "lit";
import { mdiStarFourPoints } from "@mdi/js";

import { customElement, state, property } from "lit/decorators";
import type {
  AITaskPreferences,
  GenDataTask,
  GenDataTaskResult,
} from "../data/ai_task";
import { fetchAITaskPreferences, generateDataAITask } from "../data/ai_task";
import "./chips/ha-assist-chip";
import "./ha-svg-icon";
import type { HomeAssistant } from "../types";
import { fireEvent } from "../common/dom/fire_event";
import { isComponentLoaded } from "../common/config/is_component_loaded";

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
  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: "task-type" })
  public taskType!: "data";

  @property({ attribute: false })
  generateTask!: () => SuggestWithAIGenerateTask;

  @state()
  private _aiPrefs?: AITaskPreferences;

  @state()
  private _state: {
    status: "idle" | "suggesting" | "error" | "done";
    suggestionIndex: 1 | 2 | 3;
  } = {
    status: "idle",
    suggestionIndex: 1,
  };

  private _intervalId?: number;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    if (!this.hass || !isComponentLoaded(this.hass, "ai_task")) {
      return;
    }
    fetchAITaskPreferences(this.hass).then((prefs) => {
      this._aiPrefs = prefs;
    });
  }

  render() {
    if (!this._aiPrefs || !this._aiPrefs.gen_data_entity_id) {
      return nothing;
    }

    let label: string;
    switch (this._state.status) {
      case "error":
        label = this.hass.localize("ui.components.suggest_with_ai.error");
        break;
      case "done":
        label = this.hass.localize("ui.components.suggest_with_ai.done");
        break;
      case "suggesting":
        label = this.hass.localize(
          `ui.components.suggest_with_ai.suggesting_${this._state.suggestionIndex}`
        );
        break;
      default:
        label = this.hass.localize("ui.components.suggest_with_ai.label");
    }

    return html`
      <ha-assist-chip
        @click=${this._suggest}
        .label=${label}
        ?active=${this._state.status === "suggesting"}
        class=${this._state.status === "error"
          ? "error"
          : this._state.status === "done"
            ? "done"
            : ""}
      >
        <ha-svg-icon slot="icon" .path=${mdiStarFourPoints}></ha-svg-icon>
      </ha-assist-chip>
    `;
  }

  private async _suggest() {
    if (!this.generateTask || this._state.status === "suggesting") {
      return;
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
        result = await generateDataAITask(this.hass, info.task);
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
