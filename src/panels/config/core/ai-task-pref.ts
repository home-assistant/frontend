import { mdiCog, mdiHelpCircleOutline, mdiStarFourPoints } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { HaProgressButton } from "../../../components/buttons/ha-progress-button";
import "../../../components/entity/ha-entity-picker";
import type { HaEntityPicker } from "../../../components/entity/ha-entity-picker";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
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

type EntityPreferenceKey = Exclude<
  keyof AITaskPreferences,
  "allow_automatic_evaluation"
>;

const filterGenData = (entity: HassEntity) =>
  computeDomain(entity.entity_id) === "ai_task" &&
  supportsFeature(entity, AITaskEntityFeature.GENERATE_DATA);
const filterGenImage = (entity: HassEntity) =>
  computeDomain(entity.entity_id) === "ai_task" &&
  supportsFeature(entity, AITaskEntityFeature.GENERATE_IMAGE);

const filterEvaluate = (entity: HassEntity) =>
  computeDomain(entity.entity_id) === "ai_task" &&
  supportsFeature(entity, AITaskEntityFeature.EVALUATE);

@customElement("ai-task-pref")
export class AITaskPref extends LitElement {
  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _prefs?: AITaskPreferences;

  @state() private _pendingPrefs: Partial<AITaskPreferences> = {};

  @state() private _configFlows: Partial<
    Record<EntityPreferenceKey, EntityConfigFlow>
  > = {};

  @state() private _saving = false;

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    if (!this.hass || !isComponentLoaded(this.hass.config, "ai_task")) {
      return;
    }
    fetchAITaskPreferences(this.hass).then((prefs) => {
      this._prefs = prefs;
      this._updateConfigFlow("gen_data_entity_id");
      this._updateConfigFlow("gen_image_entity_id");
      this._updateConfigFlow("evaluate_entity_id");
    });
  }

  protected render() {
    const prefs = { ...this._prefs, ...this._pendingPrefs };
    const disabled =
      this._saving ||
      (this._prefs === undefined &&
        isComponentLoaded(this.hass.config, "ai_task"));
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
              this.hass.localize("ui.panel.config.ai_task.gen_data_header"),
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
              this.hass.localize("ui.panel.config.ai_task.gen_image_header"),
              this.hass.localize("ui.panel.config.ai_task.gen_image_settings")
            )}
          </ha-settings-row>
          <ha-settings-row .narrow=${this.narrow}>
            <span slot="heading">
              ${this.hass.localize("ui.panel.config.ai_task.evaluate_header")}
            </span>
            <span slot="description">
              ${this.hass.localize("ui.panel.config.ai_task.evaluate_description")}
            </span>
            ${this._renderPicker(
              "evaluate_entity_id",
              filterEvaluate,
              this.hass.localize("ui.panel.config.ai_task.evaluate_header"),
              this.hass.localize("ui.panel.config.ai_task.evaluate_settings")
            )}
          </ha-settings-row>
          <ha-switch
            .checked=${prefs.allow_automatic_evaluation ?? false}
            .disabled=${disabled || !prefs.evaluate_entity_id}
            @change=${this._handleAutomaticEvaluationChange}
          >
            <span class="automatic-evaluation-heading">
              ${this.hass.localize(
                "ui.panel.config.ai_task.allow_automatic_evaluation"
              )}
            </span>
            <span class="automatic-evaluation-description">
              ${this.hass.localize(
                "ui.panel.config.ai_task.allow_automatic_evaluation_description"
              )}
            </span>
          </ha-switch>
        </div>
        <div class="card-actions">
          <ha-progress-button .disabled=${disabled} @click=${this._update}>
            ${this.hass!.localize("ui.common.save")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  private _renderPicker(
    key: EntityPreferenceKey,
    entityFilter: (entity: HassEntity) => boolean,
    label: string,
    settingsLabel: string
  ) {
    const configFlow = this._configFlows[key];
    return html`
      <div class="picker">
        <ha-entity-picker
          data-name=${key}
          .ariaLabel=${label}
          .disabled=${
            this._saving ||
            (this._prefs === undefined &&
              isComponentLoaded(this.hass.config, "ai_task"))
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
                .disabled=${this._saving}
                @click=${this._openConfigFlow}
              ></ha-icon-button>`
            : nothing
        }
      </div>
    `;
  }

  private _entityId(key: EntityPreferenceKey) {
    const value = this._pendingPrefs[key];
    return value === undefined ? this._prefs?.[key] : value;
  }

  private async _updateConfigFlow(key: EntityPreferenceKey) {
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

  private _handlePrefChange(
    ev: ValueChangedEvent<string | undefined> &
      HASSDomCurrentTargetEvent<HaEntityPicker>
  ) {
    const key = ev.currentTarget.dataset.name as EntityPreferenceKey;
    const value = ev.detail.value || null;
    this._pendingPrefs = {
      ...this._pendingPrefs,
      [key]: value,
      ...(key === "evaluate_entity_id" && !value
        ? { allow_automatic_evaluation: false }
        : {}),
    };
    this._updateConfigFlow(key);
  }

  private _openConfigFlow(ev: HASSDomCurrentTargetEvent<HTMLElement>) {
    const key = ev.currentTarget.dataset.name as EntityPreferenceKey;
    const configFlow = this._configFlows[key];
    if (configFlow) {
      showEntityConfigFlow(this, this.hass, configFlow);
    }
  }

  private _handleAutomaticEvaluationChange(
    ev: HASSDomCurrentTargetEvent<HaSwitch>
  ) {
    this._pendingPrefs = {
      ...this._pendingPrefs,
      allow_automatic_evaluation: ev.currentTarget.checked,
    };
  }

  private async _update(ev: HASSDomCurrentTargetEvent<HaProgressButton>) {
    const button = ev.currentTarget;
    if (this._saving) {
      return;
    }
    button.progress = true;
    this._saving = true;

    try {
      this._prefs = await saveAITaskPreferences(this.hass, this._pendingPrefs);
      this._pendingPrefs = {};
      button.actionSuccess();
    } catch {
      button.actionError();
    } finally {
      button.progress = false;
      this._saving = false;
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
    ha-switch {
      display: block;
      margin-block-start: var(--ha-space-4);
    }
    ha-switch::part(base) {
      height: auto;
      flex-direction: row-reverse;
    }
    ha-switch::part(label) {
      flex: 1;
      margin-inline-start: 0;
      margin-inline-end: var(--ha-space-4);
    }
    .automatic-evaluation-heading,
    .automatic-evaluation-description {
      display: block;
    }
    .automatic-evaluation-description {
      margin-block-start: var(--ha-space-1);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
      line-height: normal;
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
