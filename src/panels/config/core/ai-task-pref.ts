import { mdiHelpCircle, mdiStarFourPoints } from "@mdi/js";
import { css, html, LitElement } from "lit";
import type { HassEntity } from "home-assistant-js-websocket";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import type { HaProgressButton } from "../../../components/buttons/ha-progress-button";
import "../../../components/entity/ha-entity-picker";
import type { HaEntityPicker } from "../../../components/entity/ha-entity-picker";
import "../../../components/ha-card";
import "../../../components/ha-settings-row";
import {
  AITaskEntityFeature,
  fetchAITaskPreferences,
  saveAITaskPreferences,
  type AITaskPreferences,
} from "../../../data/ai_task";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";

const filterGenData = (entity: HassEntity) =>
  computeDomain(entity.entity_id) === "ai_task" &&
  supportsFeature(entity, AITaskEntityFeature.GENERATE_DATA);
const filterGenImage = (entity: HassEntity) =>
  computeDomain(entity.entity_id) === "ai_task" &&
  supportsFeature(entity, AITaskEntityFeature.GENERATE_IMAGE);

@customElement("ai-task-pref")
export class AITaskPref extends LitElement {
  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _prefs?: AITaskPreferences;

  private _gen_data_entity_id?: string | null;

  private _gen_image_entity_id?: string | null;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (!this.hass || !isComponentLoaded(this.hass, "ai_task")) {
      return;
    }
    fetchAITaskPreferences(this.hass).then((prefs) => {
      this._prefs = prefs;
    });
  }

  protected render() {
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
              .disabled=${this._prefs === undefined &&
              isComponentLoaded(this.hass, "ai_task")}
              .value=${this._gen_data_entity_id ||
              this._prefs?.gen_data_entity_id}
              .entityFilter=${filterGenData}
              @value-changed=${this._handlePrefChange}
            ></ha-entity-picker>
          </ha-settings-row>
          <ha-settings-row .narrow=${this.narrow}>
            <span slot="heading">
              ${this.hass!.localize("ui.panel.config.ai_task.gen_image_header")}
            </span>
            <span slot="description">
              ${this.hass!.localize(
                "ui.panel.config.ai_task.gen_image_description"
              )}
            </span>
            <ha-entity-picker
              data-name="gen_image_entity_id"
              .hass=${this.hass}
              .disabled=${this._prefs === undefined &&
              isComponentLoaded(this.hass, "ai_task")}
              .value=${this._gen_image_entity_id ||
              this._prefs?.gen_image_entity_id}
              .entityFilter=${filterGenImage}
              @value-changed=${this._handlePrefChange}
            ></ha-entity-picker>
          </ha-settings-row>
        </div>
        <div class="card-actions">
          <ha-progress-button @click=${this._update}>
            ${this.hass!.localize("ui.common.save")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  private _handlePrefChange(ev: CustomEvent<{ value: string | undefined }>) {
    const input = ev.target as HaEntityPicker;
    const key = input.dataset.name as keyof AITaskPreferences;
    const value = ev.detail.value || null;
    this[`_${key}`] = value;
  }

  private async _update(ev) {
    const button = ev.target as HaProgressButton;
    if (button.progress) {
      return;
    }
    button.progress = true;

    const oldPrefs = this._prefs;
    const update: Partial<AITaskPreferences> = {
      gen_data_entity_id: this._gen_data_entity_id,
      gen_image_entity_id: this._gen_image_entity_id,
    };
    this._prefs = { ...this._prefs!, ...update };
    try {
      this._prefs = await saveAITaskPreferences(this.hass, {
        ...update,
      });
      button.actionSuccess();
    } catch (_err: any) {
      button.actionError();
      this._prefs = oldPrefs;
    } finally {
      button.progress = false;
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
    .card-actions {
      text-align: right;
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
