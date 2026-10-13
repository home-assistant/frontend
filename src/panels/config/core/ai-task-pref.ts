import { mdiCog, mdiHelpCircleOutline, mdiStarFourPoints } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { HaProgressButton } from "../../../components/buttons/ha-progress-button";
import "../../../components/entity/ha-entity-picker";
import type { HaEntityPicker } from "../../../components/entity/ha-entity-picker";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-settings-row";
import {
  AITaskEntityFeature,
  fetchAITaskPreferences,
  saveAITaskPreferences,
  type AITaskPreferences,
} from "../../../data/ai_task";
import type { EntityConfigFlow } from "../../../dialogs/config-flow/entity-config-flow";
import {
  fetchEntityConfigFlow,
  showEntityConfigFlow,
} from "../../../dialogs/config-flow/entity-config-flow";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";

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

  @state() private _configFlows: Partial<
    Record<keyof AITaskPreferences, EntityConfigFlow>
  > = {};

  private _gen_data_entity_id?: string | null;

  private _gen_image_entity_id?: string | null;

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    if (!this.hass || !isComponentLoaded(this.hass.config, "ai_task")) {
      return;
    }
    fetchAITaskPreferences(this.hass).then((prefs) => {
      this._prefs = prefs;
      this._updateConfigFlow("gen_data_entity_id");
      this._updateConfigFlow("gen_image_entity_id");
    });
  }

  protected render() {
    return html`
      <ha-card outlined>
        <h1 class="card-header">
          <img
            alt=""
            src=${brandsUrl(
              {
                domain: "ai_task",
                type: "icon",
                darkOptimized: this.hass.themes?.darkMode,
              },
              this.hass.auth.data.hassUrl
            )}
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
          />${this.hass.localize("ui.panel.config.ai_task.header")}
        </h1>
        <div class="header-actions">
          <ha-icon-button
            .label=${this.hass.localize(
              "ui.panel.config.cloud.account.alexa.link_learn_how_it_works"
            )}
            .path=${mdiHelpCircleOutline}
            href=${documentationUrl(this.hass, "/integrations/ai_task/")}
            target="_blank"
            rel="noreferrer"
            class="icon-link"
          ></ha-icon-button>
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
            ${this._renderPicker(
              "gen_data_entity_id",
              filterGenData,
              this.hass.localize("ui.panel.config.ai_task.gen_data_settings")
            )}
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
            ${this._renderPicker(
              "gen_image_entity_id",
              filterGenImage,
              this.hass.localize("ui.panel.config.ai_task.gen_image_settings")
            )}
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

  private _renderPicker(
    key: keyof AITaskPreferences,
    entityFilter: (entity: HassEntity) => boolean,
    settingsLabel: string
  ) {
    const configFlow = this._configFlows[key];
    return html`
      <div class="picker">
        <ha-entity-picker
          data-name=${key}
          .disabled=${
            this._prefs === undefined &&
            isComponentLoaded(this.hass.config, "ai_task")
          }
          .value=${this._entityId(key) ?? undefined}
          .entityFilter=${entityFilter}
          @value-changed=${this._handlePrefChange}
        ></ha-entity-picker>
        ${
          configFlow
            ? html`<ha-icon-button
                data-name=${key}
                .label=${settingsLabel}
                .path=${mdiCog}
                @click=${this._openConfigFlow}
              ></ha-icon-button>`
            : nothing
        }
      </div>
    `;
  }

  private _entityId(key: keyof AITaskPreferences) {
    const value = this[`_${key}`];
    return value === undefined ? this._prefs?.[key] : value;
  }

  private async _updateConfigFlow(key: keyof AITaskPreferences) {
    const entityId = this._entityId(key);
    this._configFlows = { ...this._configFlows, [key]: undefined };
    let configFlow: EntityConfigFlow | undefined;
    try {
      configFlow = entityId
        ? await fetchEntityConfigFlow(this.hass, entityId)
        : undefined;
    } catch (_err) {
      configFlow = undefined;
    }
    if (entityId === this._entityId(key)) {
      this._configFlows = { ...this._configFlows, [key]: configFlow };
    }
  }

  private _handlePrefChange(ev: ValueChangedEvent<string | undefined>) {
    const input = ev.target as HaEntityPicker;
    const key = input.dataset.name as keyof AITaskPreferences;
    const value = ev.detail.value || null;
    this[`_${key}`] = value;
    this._updateConfigFlow(key);
  }

  private _openConfigFlow(ev: Event) {
    const key = (ev.currentTarget as HTMLElement).dataset
      .name as keyof AITaskPreferences;
    const configFlow = this._configFlows[key];
    if (configFlow) {
      showEntityConfigFlow(this, this.hass, configFlow);
    }
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
    .picker {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      margin-inline-start: var(--ha-space-4);
    }
    :host([narrow]) .picker {
      margin-inline-start: 0;
    }
    .picker ha-entity-picker {
      flex: 1;
      min-width: 0;
    }
    .picker ha-icon-button {
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ai-task-pref": AITaskPref;
  }
}
