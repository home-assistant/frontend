import { mdiHelpCircleOutline, mdiStarFourPoints } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { HaProgressButton } from "../../../components/buttons/ha-progress-button";
import "../../../components/entity/ha-entity-picker";
import type { HaEntityPicker } from "../../../components/entity/ha-entity-picker";
import "../../../components/ha-card";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import {
  AITaskEntityFeature,
  fetchAITaskPreferences,
  saveAITaskPreferences,
  type AITaskPreferences,
} from "../../../data/ai_task";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";

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

  @state() private _saving = false;

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    if (!this.hass || !isComponentLoaded(this.hass.config, "ai_task")) {
      return;
    }
    fetchAITaskPreferences(this.hass).then((prefs) => {
      this._prefs = prefs;
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
            <ha-entity-picker
              data-name="gen_data_entity_id"
              .disabled=${disabled}
              .value=${prefs.gen_data_entity_id ?? undefined}
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
              .disabled=${disabled}
              .value=${prefs.gen_image_entity_id ?? undefined}
              .entityFilter=${filterGenImage}
              @value-changed=${this._handlePrefChange}
            ></ha-entity-picker>
          </ha-settings-row>
          <ha-settings-row .narrow=${this.narrow}>
            <span slot="heading">
              ${this.hass.localize("ui.panel.config.ai_task.evaluate_header")}
            </span>
            <span slot="description">
              ${this.hass.localize("ui.panel.config.ai_task.evaluate_description")}
            </span>
            <ha-entity-picker
              data-name="evaluate_entity_id"
              .disabled=${disabled}
              .value=${prefs.evaluate_entity_id ?? undefined}
              .entityFilter=${filterEvaluate}
              @value-changed=${this._handlePrefChange}
            ></ha-entity-picker>
          </ha-settings-row>
          <ha-switch
            .checked=${prefs.allow_automatic_evaluation ?? false}
            .disabled=${disabled || !prefs.evaluate_entity_id}
            @change=${this._handleAutomaticEvaluationChange}
          >
            ${this.hass.localize("ui.panel.config.ai_task.allow_automatic_evaluation")}
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

  private _handlePrefChange(
    ev: ValueChangedEvent<string | undefined> &
      HASSDomCurrentTargetEvent<HaEntityPicker>
  ) {
    const key = ev.currentTarget.dataset.name as Exclude<
      keyof AITaskPreferences,
      "allow_automatic_evaluation"
    >;
    const value = ev.detail.value || null;
    this._pendingPrefs = {
      ...this._pendingPrefs,
      [key]: value,
      ...(key === "evaluate_entity_id" && !value
        ? { allow_automatic_evaluation: false }
        : {}),
    };
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
    }
    ha-switch::part(label) {
      margin-inline-start: var(--ha-space-4);
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
