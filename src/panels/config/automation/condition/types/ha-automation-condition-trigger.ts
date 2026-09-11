import { consume } from "@lit/context";
import { mdiAlert, mdiLinkVariantOff } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { HASSDomCurrentTargetEvent } from "../../../../../common/dom/fire_event";
import { capitalizeFirstLetter } from "../../../../../common/string/capitalize-first-letter";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../../components/ha-checkbox";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-trigger-icon";
import type { TriggerCondition } from "../../../../../data/automation";
import {
  automationTriggerContext,
  type AutomationTriggerContext,
  type TriggerIdOption,
} from "../../trigger/automation-trigger-id";
import { describeTrigger } from "../../../../../data/automation_i18n";
import { fullEntitiesContext } from "../../../../../data/context";
import type { EntityRegistryEntry } from "../../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../../types";
import { rowStyles } from "../../styles";

@customElement("ha-automation-condition-trigger")
export class HaTriggerCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: TriggerCondition;

  @property({ type: Boolean }) public disabled = false;

  @state()
  @consume({ context: automationTriggerContext, subscribe: true })
  private _triggers?: AutomationTriggerContext;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  private _entityReg: EntityRegistryEntry[] = [];

  public static get defaultConfig(): TriggerCondition {
    return {
      condition: "trigger",
      id: "",
    };
  }

  protected render() {
    const selectedIds = ensureArray(this.condition.id).filter(Boolean);
    const triggerIdOptions = this._triggers?.options ?? [];
    const missingIds = this._missingIds(this.condition.id, triggerIdOptions);

    if (!triggerIdOptions.length && !selectedIds.length) {
      return this.hass.localize(
        "ui.panel.config.automation.editor.conditions.type.trigger.no_triggers"
      );
    }

    return html`
      ${
        missingIds.length
          ? html`<ha-alert alert-type="warning">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.conditions.type.trigger.missing_triggers"
              )}
            </ha-alert>`
          : nothing
      }
      ${
        triggerIdOptions.some((option) => option.duplicate)
          ? html`<ha-alert alert-type="warning">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.conditions.type.trigger.duplicate_ids"
              )}
              <ha-button
                slot="action"
                size="s"
                appearance="filled"
                .disabled=${this.disabled}
                @click=${this._fixDuplicateIds}
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.conditions.type.trigger.duplicate_ids_fix"
                )}
              </ha-button>
            </ha-alert>`
          : nothing
      }
      <div class="trigger-list">
        ${triggerIdOptions.map(
          (option) => html`
            <ha-checkbox
              .checked=${selectedIds.includes(option.id)}
              .value=${option.id}
              .disabled=${this.disabled}
              @change=${this._checkedChanged}
            >
              <span class="trigger-option">
                <span class="trigger-index-badge">${option.index + 1}</span>
                <ha-trigger-icon
                  .trigger=${"trigger" in option.trigger ? option.trigger.trigger : ""}
                ></ha-trigger-icon>
                ${
                  option.duplicate
                    ? html`<span class="duplicate-trigger-badge">
                        <ha-svg-icon .path=${mdiAlert}></ha-svg-icon>
                        <span class="duplicate-trigger-id">${option.id}</span>
                      </span>`
                    : nothing
                }
                <span
                  >${capitalizeFirstLetter(describeTrigger(option.trigger, this.hass, this._entityReg))}</span
                >
              </span>
            </ha-checkbox>
          `
        )}
        ${missingIds.map(
          (id) => html`
            <ha-checkbox
              .checked=${true}
              .value=${id}
              .disabled=${this.disabled}
              @change=${this._checkedChanged}
            >
              <span class="trigger-option">
                <span class="missing-trigger-badge">
                  <ha-svg-icon .path=${mdiLinkVariantOff}></ha-svg-icon>
                  ${selectedIds.indexOf(id) + 1}
                </span>
                <span>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.conditions.type.trigger.missing_trigger"
                  )}
                </span>
              </span>
            </ha-checkbox>
          `
        )}
      </div>
    `;
  }

  private _checkedChanged(ev: HASSDomCurrentTargetEvent<HaCheckbox>): void {
    ev.stopPropagation();
    const id = ev.currentTarget.value;
    if (!id) {
      return;
    }

    const ids = ensureArray(this.condition.id).filter(Boolean);
    const checked = ev.currentTarget.checked;
    const selectedIds = checked
      ? ids.includes(id)
        ? ids
        : [...ids, id]
      : ids.filter((_id) => _id !== id);
    if (this._triggers) {
      this._triggers.select(this.condition, selectedIds);
      return;
    }

    const newValue: TriggerCondition = {
      ...this.condition,
      id: selectedIds.length ? selectedIds : "",
    };

    fireEvent(this, "value-changed", { value: newValue });
  }

  private _fixDuplicateIds = () => {
    if (!this.disabled) {
      return this._triggers?.fixDuplicateIds();
    }
    return undefined;
  };

  private _missingIds = memoizeOne(
    (ids: TriggerCondition["id"], triggerIdOptions: TriggerIdOption[]) => {
      const availableIds = new Set(triggerIdOptions.map((option) => option.id));
      return ensureArray(ids).filter((id) => id && !availableIds.has(id));
    }
  );

  static styles = [
    rowStyles,
    css`
      ha-alert {
        display: block;
        margin-bottom: var(--ha-space-4);
      }
      .trigger-list {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-4);
      }
      .trigger-option {
        display: inline-flex;
        align-items: center;
        gap: var(--ha-space-2);
      }
      ha-trigger-icon {
        --mdc-icon-size: 20px;
        color: var(--ha-color-on-neutral-quiet);
      }
      .missing-trigger-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--ha-space-1);
        padding: 2px var(--ha-space-2);
        border-radius: var(--ha-border-radius-md);
        background: var(--ha-color-fill-warning-normal-resting);
        color: var(--ha-color-on-warning-normal);
        line-height: 18px;
      }
      .missing-trigger-badge ha-svg-icon {
        --mdc-icon-size: 18px;
      }
      .duplicate-trigger-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--ha-space-1);
        max-width: 120px;
        padding: 2px var(--ha-space-2);
        border-radius: var(--ha-border-radius-md);
        background: var(--ha-color-fill-warning-normal-resting);
        color: var(--ha-color-on-warning-normal);
        line-height: 18px;
      }
      .duplicate-trigger-id {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .duplicate-trigger-badge ha-svg-icon {
        --mdc-icon-size: 18px;
        flex-shrink: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-trigger": HaTriggerCondition;
  }
}
