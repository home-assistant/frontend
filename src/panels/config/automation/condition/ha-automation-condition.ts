import "@material/mwc-button";
import type { ActionDetail } from "@material/mwc-list";
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiContentPaste,
  mdiDrag,
  mdiPlus,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import type { SortableEvent } from "sortablejs";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-svg-icon";
import type {
  AutomationClipboard,
  Condition,
} from "../../../../data/automation";
import type { Entries, HomeAssistant } from "../../../../types";
import "./ha-automation-condition-row";
import type HaAutomationConditionRow from "./ha-automation-condition-row";
// Uncommenting these and this element doesn't load
// import "./types/ha-automation-condition-not";
// import "./types/ha-automation-condition-or";
import { storage } from "../../../../common/decorators/storage";
import { stringCompare } from "../../../../common/string/compare";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { HaSelect } from "../../../../components/ha-select";
import { CONDITION_TYPES } from "../../../../data/condition";
import { sortableStyles } from "../../../../resources/ha-sortable-style";
import type { SortableInstance } from "../../../../resources/sortable";
import "./types/ha-automation-condition-and";
import "./types/ha-automation-condition-device";
import "./types/ha-automation-condition-numeric_state";
import "./types/ha-automation-condition-state";
import "./types/ha-automation-condition-sun";
import "./types/ha-automation-condition-template";
import "./types/ha-automation-condition-time";
import "./types/ha-automation-condition-trigger";
import "./types/ha-automation-condition-zone";

const PASTE_VALUE = "__paste__";

@customElement("ha-automation-condition")
export default class HaAutomationCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public conditions!: Condition[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public nested = false;

  @property({ type: Boolean }) public reOrderMode = false;

  @storage({
    key: "automationClipboard",
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: AutomationClipboard;

  private _focusLastConditionOnChange = false;

  private _conditionKeys = new WeakMap<Condition, string>();

  private _sortable?: SortableInstance;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("reOrderMode")) {
      if (this.reOrderMode) {
        this._createSortable();
      } else {
        this._destroySortable();
      }
    }

    if (!changedProperties.has("conditions")) {
      return;
    }

    let updatedConditions: Condition[] | undefined;
    if (!Array.isArray(this.conditions)) {
      updatedConditions = [this.conditions];
    }

    (updatedConditions || this.conditions).forEach((condition, index) => {
      if (typeof condition === "string") {
        updatedConditions = updatedConditions || [...this.conditions];
        updatedConditions[index] = {
          condition: "template",
          value_template: condition,
        };
      }
    });

    if (updatedConditions) {
      fireEvent(this, "value-changed", {
        value: updatedConditions,
      });
    } else if (this._focusLastConditionOnChange) {
      this._focusLastConditionOnChange = false;
      const row = this.shadowRoot!.querySelector<HaAutomationConditionRow>(
        "ha-automation-condition-row:last-of-type"
      )!;
      row.updateComplete.then(() => {
        row.expand();
        row.scrollIntoView();
        row.focus();
      });
    }
  }

  protected render() {
    if (!Array.isArray(this.conditions)) {
      return nothing;
    }
    return html`
      ${this.reOrderMode && !this.nested
        ? html`
            <ha-alert
              alert-type="info"
              .title=${this.hass.localize(
                "ui.panel.config.automation.editor.re_order_mode.title"
              )}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.re_order_mode.description_conditions"
              )}
              <mwc-button slot="action" @click=${this._exitReOrderMode}>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.re_order_mode.exit"
                )}
              </mwc-button>
            </ha-alert>
          `
        : null}
      <div class="conditions">
        ${repeat(
          this.conditions,
          (condition) => this._getKey(condition),
          (cond, idx) => html`
            <ha-automation-condition-row
              .index=${idx}
              .totalConditions=${this.conditions.length}
              .condition=${cond}
              .hideMenu=${this.reOrderMode}
              .reOrderMode=${this.reOrderMode}
              .disabled=${this.disabled}
              @duplicate=${this._duplicateCondition}
              @move-condition=${this._move}
              @value-changed=${this._conditionChanged}
              @re-order=${this._enterReOrderMode}
              .hass=${this.hass}
            >
              ${this.reOrderMode
                ? html`
                    <ha-icon-button
                      .index=${idx}
                      slot="icons"
                      .label=${this.hass.localize(
                        "ui.panel.config.automation.editor.move_up"
                      )}
                      .path=${mdiArrowUp}
                      @click=${this._moveUp}
                      .disabled=${idx === 0}
                    ></ha-icon-button>
                    <ha-icon-button
                      .index=${idx}
                      slot="icons"
                      .label=${this.hass.localize(
                        "ui.panel.config.automation.editor.move_down"
                      )}
                      .path=${mdiArrowDown}
                      @click=${this._moveDown}
                      .disabled=${idx === this.conditions.length - 1}
                    ></ha-icon-button>
                    <div class="handle" slot="icons">
                      <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                    </div>
                  `
                : ""}
            </ha-automation-condition-row>
          `
        )}
      </div>
      <ha-button-menu
        @action=${this._addCondition}
        .disabled=${this.disabled}
        fixed
      >
        <ha-button
          slot="trigger"
          outlined
          .disabled=${this.disabled}
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.add"
          )}
        >
          <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
        </ha-button>
        ${this._clipboard?.condition
          ? html` <mwc-list-item .value=${PASTE_VALUE} graphic="icon">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.conditions.paste"
              )}
              (${this.hass.localize(
                `ui.panel.config.automation.editor.conditions.type.${this._clipboard.condition.condition}.label`
              )})
              <ha-svg-icon slot="graphic" .path=${mdiContentPaste}></ha-svg-icon
            ></mwc-list-item>`
          : nothing}
        ${this._processedTypes(this.hass.localize).map(
          ([opt, label, icon]) => html`
            <mwc-list-item .value=${opt} graphic="icon">
              ${label}<ha-svg-icon slot="graphic" .path=${icon}></ha-svg-icon
            ></mwc-list-item>
          `
        )}
      </ha-button-menu>
    `;
  }

  private async _enterReOrderMode(ev: CustomEvent) {
    if (this.nested) return;
    ev.stopPropagation();
    this.reOrderMode = true;
  }

  private async _exitReOrderMode() {
    this.reOrderMode = false;
  }

  private async _createSortable() {
    const Sortable = (await import("../../../../resources/sortable")).default;
    this._sortable = new Sortable(
      this.shadowRoot!.querySelector(".conditions")!,
      {
        animation: 150,
        fallbackClass: "sortable-fallback",
        handle: ".handle",
        onChoose: (evt: SortableEvent) => {
          (evt.item as any).placeholder =
            document.createComment("sort-placeholder");
          evt.item.after((evt.item as any).placeholder);
        },
        onEnd: (evt: SortableEvent) => {
          // put back in original location
          if ((evt.item as any).placeholder) {
            (evt.item as any).placeholder.replaceWith(evt.item);
            delete (evt.item as any).placeholder;
          }
          this._dragged(evt);
        },
      }
    );
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private _getKey(condition: Condition) {
    if (!this._conditionKeys.has(condition)) {
      this._conditionKeys.set(condition, Math.random().toString());
    }

    return this._conditionKeys.get(condition)!;
  }

  private _addCondition(ev: CustomEvent<ActionDetail>) {
    const value = (ev.currentTarget as HaSelect).items[ev.detail.index].value;

    let conditions: Condition[];
    if (value === PASTE_VALUE) {
      conditions = this.conditions.concat(
        deepClone(this._clipboard!.condition)
      );
    } else {
      const condition = value as Condition["condition"];

      const elClass = customElements.get(
        `ha-automation-condition-${condition}`
      ) as CustomElementConstructor & {
        defaultConfig: Omit<Condition, "condition">;
      };

      conditions = this.conditions.concat({
        condition: condition as any,
        ...elClass.defaultConfig,
      });
    }
    this._focusLastConditionOnChange = true;
    fireEvent(this, "value-changed", { value: conditions });
  }

  private _moveUp(ev) {
    const index = (ev.target as any).index;
    const newIndex = index - 1;
    this._move(index, newIndex);
  }

  private _moveDown(ev) {
    const index = (ev.target as any).index;
    const newIndex = index + 1;
    this._move(index, newIndex);
  }

  private _dragged(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) return;
    this._move(ev.oldIndex!, ev.newIndex!);
  }

  private _move(index: number, newIndex: number) {
    const conditions = this.conditions.concat();
    const condition = conditions.splice(index, 1)[0];
    conditions.splice(newIndex, 0, condition);
    fireEvent(this, "value-changed", { value: conditions });
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const conditions = [...this.conditions];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      conditions.splice(index, 1);
    } else {
      // Store key on new value.
      const key = this._getKey(conditions[index]);
      this._conditionKeys.set(newValue, key);

      conditions[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: conditions });
  }

  private _duplicateCondition(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    fireEvent(this, "value-changed", {
      value: this.conditions.concat(deepClone(this.conditions[index])),
    });
  }

  private _processedTypes = memoizeOne(
    (localize: LocalizeFunc): [string, string, string][] =>
      (Object.entries(CONDITION_TYPES) as Entries<typeof CONDITION_TYPES>)
        .map(
          ([condition, icon]) =>
            [
              condition,
              localize(
                `ui.panel.config.automation.editor.conditions.type.${condition}.label`
              ),
              icon,
            ] as [string, string, string]
        )
        .sort((a, b) => stringCompare(a[1], b[1], this.hass.locale.language))
  );

  static get styles(): CSSResultGroup {
    return [
      sortableStyles,
      css`
        ha-automation-condition-row {
          display: block;
          margin-bottom: 16px;
          scroll-margin-top: 48px;
        }
        ha-svg-icon {
          height: 20px;
        }
        ha-alert {
          display: block;
          margin-bottom: 16px;
          border-radius: var(--ha-card-border-radius, 12px);
          overflow: hidden;
        }
        .handle {
          cursor: move;
          padding: 12px;
        }
        .handle ha-svg-icon {
          pointer-events: none;
          height: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition": HaAutomationCondition;
  }
}
