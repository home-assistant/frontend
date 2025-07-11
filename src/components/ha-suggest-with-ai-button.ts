import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { mdiStarFourPoints } from "@mdi/js";

import { customElement, state, property } from "lit/decorators";
import type {
  AITaskPreferences,
  GenDataTask,
  GenDataTaskResult,
} from "../data/ai_task";
import { fetchAITaskPreferences, generateDataAITask } from "../data/ai_task";
import "./chips/ha-assist-chip";
import type { HomeAssistant } from "../types";
import { fireEvent } from "../common/dom/fire_event";
import { isComponentLoaded } from "../common/config/is_component_loaded";

declare global {
  interface HASSDomEvents {
    suggestion: GenDataTaskResult;
  }
}

@customElement("ha-suggest-with-ai-button")
export class HaSuggestWithAIButton extends LitElement {
  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: "task-type" })
  public taskType!: "data";

  @property({ attribute: false })
  generateTask!: () => GenDataTask;

  @state()
  private _aiPrefs?: AITaskPreferences;

  @state()
  private _suggesting = false;

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
    return html`
      <ha-assist-chip
        @click=${this._suggest}
        label=${this.hass.localize(
          this._suggesting ? "ui.common.suggesting_ai" : "ui.common.suggest_ai"
        )}
        .active=${this._suggesting}
      >
        <ha-svg-icon slot="icon" .path=${mdiStarFourPoints}></ha-svg-icon>
      </ha-assist-chip>
    `;
  }

  private async _suggest() {
    if (!this.generateTask || this._suggesting) {
      return;
    }
    try {
      this._suggesting = true;
      const task = await this.generateTask();
      const result = await generateDataAITask(this.hass, task);
      fireEvent(this, "suggestion", result);
    } finally {
      this._suggesting = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-suggest-with-ai-button": HaSuggestWithAIButton;
  }
}
