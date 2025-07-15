import "@material/mwc-button";
import { mdiHelpCircle, mdiStarFourPoints } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/ha-settings-row";
import "../../../components/entity/ha-entity-picker";
import type { HaEntityPicker } from "../../../components/entity/ha-entity-picker";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import {
  fetchAITaskPreferences,
  saveAITaskPreferences,
  type AITaskPreferences,
} from "../../../data/ai_task";
import { documentationUrl } from "../../../util/documentation-url";

@customElement("ai-task-pref")
export class AITaskPref extends LitElement {
  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _prefs?: AITaskPreferences;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    fetchAITaskPreferences(this.hass).then((prefs) => {
      this._prefs = prefs;
    });
  }

  protected render() {
    if (!this._prefs) {
      return nothing;
    }

    return html`
      <ha-card outlined>
        <h1 class="card-header">
          <img
            alt=""
            src=${brandsUrl({
              domain: "ai_task",
              type: "icon",
              darkOptimized: this.hass.themes?.darkMode,
            })}
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
          />${this.hass.localize("ui.panel.config.ai_task.header")}
        </h1>
        <div class="header-actions">
          <a
            href=${documentationUrl(this.hass, "/integrations/ai_task/")}
            target="_blank"
            rel="noreferrer"
            class="icon-link"
          >
            <ha-icon-button
              .label=${this.hass.localize(
                "ui.panel.config.cloud.account.alexa.link_learn_how_it_works"
              )}
              .path=${mdiHelpCircle}
            ></ha-icon-button>
          </a>
        </div>
        <div class="card-content">
          <p>
            ${this.hass!.localize("ui.panel.config.ai_task.description", {
              button: html`<ha-svg-icon
                .path=${mdiStarFourPoints}
              ></ha-svg-icon>`,
            })}
          </p>
          <ha-settings-row .narrow=${this.narrow}>
            <span slot="heading">
              ${this.hass!.localize("ui.panel.config.ai_task.gen_data_header")}
            </span>
            <span slot="description">
              ${this.hass!.localize(
                "ui.panel.config.ai_task.gen_data_description"
              )}
            </span>
            <ha-entity-picker
              data-name="gen_data_entity_id"
              .hass=${this.hass}
              .value=${this._prefs.gen_data_entity_id}
              .includeDomains=${["ai_task"]}
              @value-changed=${this._handlePrefChange}
            ></ha-entity-picker>
          </ha-settings-row>
        </div>
      </ha-card>
    `;
  }

  private async _handlePrefChange(
    ev: CustomEvent<{ value: string | undefined }>
  ) {
    const input = ev.target as HaEntityPicker;
    const key = input.getAttribute("data-name") as keyof AITaskPreferences;
    const entityId = ev.detail.value || null;
    const oldPrefs = this._prefs;
    this._prefs = { ...this._prefs!, [key]: entityId };
    try {
      this._prefs = await saveAITaskPreferences(this.hass, {
        [key]: entityId,
      });
    } catch (_err: any) {
      this._prefs = oldPrefs;
    }
  }

  static styles = css`
    .card-header {
      display: flex;
      align-items: center;
    }
    .card-header img {
      max-width: 28px;
      margin-right: 16px;
    }
    a {
      color: var(--primary-color);
    }
    ha-settings-row {
      padding: 0;
    }
    .header-actions {
      position: absolute;
      right: 0px;
      inset-inline-end: 0px;
      inset-inline-start: initial;
      top: 24px;
      display: flex;
      flex-direction: row;
    }
    .header-actions .icon-link {
      margin-top: -16px;
      margin-right: 8px;
      margin-inline-end: 8px;
      margin-inline-start: initial;
      direction: var(--direction);
      color: var(--secondary-text-color);
    }
    ha-entity-picker {
      flex: 1;
      margin-left: 16px;
    }
    :host([narrow]) ha-entity-picker {
      margin-left: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ai-task-pref": AITaskPref;
  }
}
