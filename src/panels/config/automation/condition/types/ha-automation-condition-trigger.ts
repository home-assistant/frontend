import { consume } from "@lit/context";
import { mdiAlert } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-form/ha-form";
import "../../../../../components/ha-select";
import "../../../../../components/item/ha-list-item-option";
import type { HaListItemOption } from "../../../../../components/item/ha-list-item-option";
import "../../../../../components/list/ha-list-selectable";
import type { HaListSelectable } from "../../../../../components/list/ha-list-selectable";
import type { HaListSelectedDetail } from "../../../../../components/list/types";
import {
  automationConfigContext,
  type AutomationConfig,
  type TriggerCondition,
} from "../../../../../data/automation";
import {
  getTriggerInfos,
  type TriggerInfo,
} from "../../../../../data/automation_i18n";
import { fullEntitiesContext } from "../../../../../data/context";
import type { EntityRegistryEntry } from "../../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../../types";
import "../../ha-trigger-id-chip";

@customElement("ha-automation-condition-trigger")
export class HaTriggerCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: TriggerCondition;

  @property({ type: Boolean }) public disabled = false;

  @state()
  @consume({ context: automationConfigContext, subscribe: true })
  private _automationConfig?: AutomationConfig;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  private _entityReg: EntityRegistryEntry[] = [];

  private _triggerInfos = memoizeOne(
    (
      triggers: AutomationConfig["triggers"] | undefined,
      entityReg: EntityRegistryEntry[]
    ): TriggerInfo[] =>
      getTriggerInfos(
        triggers ? ensureArray(triggers) : undefined,
        this.hass,
        entityReg
      )
  );

  public static get defaultConfig(): TriggerCondition {
    return {
      condition: "trigger",
      id: "",
    };
  }

  protected render() {
    const selectedIds = ensureArray(this.condition.id || []).filter(
      (id): id is string => typeof id === "string" && id !== ""
    );

    const triggerInfos = this._triggerInfos(
      this._automationConfig?.triggers,
      this._entityReg
    );

    if (!triggerInfos.length && !selectedIds.length) {
      return html`
        <ha-alert alert-type="info">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.type.trigger.no_triggers"
          )}
        </ha-alert>
      `;
    }

    return html`
      <ha-list-selectable @ha-list-selected=${this._valueChanged} multi>
        ${this._renderOptions(selectedIds, triggerInfos)}
      </ha-list-selectable>
    `;
  }

  private _renderOptions(selectedIds: string[], triggerInfos: TriggerInfo[]) {
    const unknownTriggerIds = selectedIds.filter(
      (id) => !triggerInfos.some((info) => info.id === id)
    );

    const alertIcon = html`<ha-svg-icon
      slot="start"
      .path=${mdiAlert}
    ></ha-svg-icon>`;

    return html`
      ${unknownTriggerIds.map(
        (id) => html`
          <ha-list-item-option
            .value=${id}
            .selected=${true}
            appearance="checkbox"
          >
            <div class="option" slot="headline">
              <ha-trigger-id-chip
                id=${`trigger-${id}`}
                warning
                .triggerId=${id}
              >
                ${alertIcon}
              </ha-trigger-id-chip>
              ${this.hass.localize("state.default.unavailable")}
              <ha-tooltip .for=${`trigger-${id}`}>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.conditions.type.trigger.unavailable_info",
                  { id: html`<b>${id}</b>` }
                )}
              </ha-tooltip>
            </div>
          </ha-list-item-option>
        `
      )}
      ${triggerInfos.map(
        (info) => html`
          <ha-list-item-option
            .value=${info.id}
            .selected=${selectedIds.includes(info.id)}
            appearance="checkbox"
          >
            <div class="option" slot="headline">
              <ha-trigger-id-chip
                id=${`trigger-${info.id}`}
                .warning=${info.count > 1}
                .triggerId=${info.id}
              >
                ${info.count > 1 ? alertIcon : nothing}
              </ha-trigger-id-chip>
              ${info.label}${info.count > 1
                ? html`<ha-tooltip .for=${`trigger-${info.id}`}
                    >${this.hass.localize(
                      "ui.panel.config.automation.editor.conditions.type.trigger.duplicated_info"
                    )}</ha-tooltip
                  >`
                : nothing}
            </div>
          </ha-list-item-option>
        `
      )}
    `;
  }

  private _valueChanged(ev: CustomEvent<HaListSelectedDetail>): void {
    ev.stopPropagation();
    if (
      !ev.detail.diff ||
      (!ev.detail.diff?.added.size && !ev.detail.diff?.removed.size)
    ) {
      return;
    }

    const ids = ensureArray(this.condition.id || []);

    const valueSet = ev.detail.diff.added.size
      ? ev.detail.diff.added
      : ev.detail.diff.removed;

    const index = valueSet.values().next().value;

    if (index === undefined) {
      return;
    }
    const triggerId = (
      (ev.currentTarget as HaListSelectable).items[index] as HaListItemOption
    ).value;
    if (triggerId === undefined || triggerId === "") {
      return;
    }

    if (ev.detail.diff.added.size) {
      ids.push(triggerId);
    } else {
      const removeIndex = ids.indexOf(triggerId);
      if (removeIndex > -1) {
        ids.splice(removeIndex, 1);
      }
    }

    fireEvent(this, "value-changed", { value: { ...this.condition, id: ids } });
  }

  static styles = css`
    .option {
      display: flex;
      align-items: center;
      gap: var(--ha-space-1);
      color: var(--ha-color-on-neutral-normal);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-trigger": HaTriggerCondition;
  }
}
