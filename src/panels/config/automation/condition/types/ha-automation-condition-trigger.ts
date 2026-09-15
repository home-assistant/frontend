import { consume } from "@lit/context";
import { mdiAlert, mdiLinkVariantOff } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { capitalizeFirstLetter } from "../../../../../common/string/capitalize-first-letter";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-trigger-icon";
import "../../../../../components/item/ha-list-item-option";
import type { HaListSelectable } from "../../../../../components/list/ha-list-selectable";
import "../../../../../components/list/ha-list-selectable";
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
      <ha-list-selectable
        multi
        controlled
        @ha-list-item-selected=${this._handleSelected}
        @ha-list-item-deselected=${this._handleDeselected}
      >
        ${triggerIdOptions.map(
          (option) => html`
            <ha-list-item-option
              .value=${option.id}
              .selected=${selectedIds.includes(option.id)}
              .disabled=${this.disabled}
              appearance="checkbox"
            >
              <span slot="start" class="trigger-row-leading">
                <span class="trigger-index-badge">${option.index + 1}</span>
                <ha-trigger-icon
                  .trigger=${
                    "trigger" in option.trigger ? option.trigger.trigger : ""
                  }
                ></ha-trigger-icon>
              </span>
              <span slot="headline">
                ${capitalizeFirstLetter(
                  describeTrigger(option.trigger, this.hass, this._entityReg)
                )}
              </span>
              ${
                option.duplicate
                  ? html`<span slot="end" class="duplicate-trigger-badge">
                      <ha-svg-icon .path=${mdiAlert}></ha-svg-icon>
                      <span class="duplicate-trigger-id">${option.id}</span>
                    </span>`
                  : nothing
              }
            </ha-list-item-option>
          `
        )}
        ${missingIds.map(
          (id) => html`
            <ha-list-item-option
              .value=${id}
              .selected=${true}
              .disabled=${this.disabled}
              appearance="checkbox"
            >
              <span slot="start" class="missing-trigger-badge">
                <ha-svg-icon .path=${mdiLinkVariantOff}></ha-svg-icon>
                <span class="missing-trigger-id">${id}</span>
              </span>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.conditions.type.trigger.missing_trigger"
                )}
              </span>
            </ha-list-item-option>
          `
        )}
      </ha-list-selectable>
    `;
  }

  private _handleSelected = (ev: CustomEvent<number>) => {
    ev.stopPropagation();
    const list = ev.currentTarget as HaListSelectable;
    const item = list.items[ev.detail] as HTMLElement & { value?: string };
    const id = item?.value;
    if (!id) {
      return;
    }
    this._selectId(id, true);
  };

  private _handleDeselected = (ev: CustomEvent<number>) => {
    ev.stopPropagation();
    const list = ev.currentTarget as HaListSelectable;
    const item = list.items[ev.detail] as HTMLElement & { value?: string };
    const id = item?.value;
    if (!id) {
      return;
    }
    this._selectId(id, false);
  };

  private _selectId(id: string, checked: boolean) {
    const ids = ensureArray(this.condition.id).filter(Boolean);
    const selectedIds = checked
      ? ids.includes(id)
        ? ids
        : [...ids, id]
      : ids.filter((_id) => _id !== id);
    if (this._triggers) {
      this._triggers.select(this.condition, selectedIds);
      return;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.condition,
        id: selectedIds.length ? selectedIds : "",
      },
    });
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
      ha-list-selectable {
        --ha-list-gap: var(--ha-space-2);
        --ha-list-padding: 0;
      }
      ha-list-item-option {
        --ha-list-item-padding: var(--ha-space-1) var(--ha-space-2);
      }
      .trigger-row-leading {
        display: inline-flex;
        align-items: center;
        gap: var(--ha-space-2);
      }
      ha-trigger-icon {
        --mdc-icon-size: 20px;
        color: var(--ha-color-on-neutral-quiet);
      }
      .missing-trigger-badge,
      .duplicate-trigger-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--ha-space-1);
        padding: 2px var(--ha-space-2);
        border-radius: var(--ha-border-radius-md);
        background: var(--ha-color-fill-warning-normal-resting);
        color: var(--ha-color-on-warning-normal);
        line-height: 18px;
      }
      .missing-trigger-badge ha-svg-icon,
      .duplicate-trigger-badge ha-svg-icon {
        --mdc-icon-size: 18px;
        flex-shrink: 0;
      }
      .missing-trigger-id,
      .duplicate-trigger-id {
        font-family: var(--ha-font-family-code);
        font-size: var(--ha-font-size-s);
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-trigger": HaTriggerCondition;
  }
}
