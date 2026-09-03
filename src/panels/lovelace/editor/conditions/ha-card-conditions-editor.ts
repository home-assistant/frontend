import { consume } from "@lit/context";
import { mdiContentPaste, mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { nextRender } from "../../../../common/util/render-status";
import "../../../../components/ha-button";
import "../../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import { ICON_CONDITION } from "../../common/icon-condition";
import type {
  Condition,
  VisibilityCondition,
} from "../../common/validate-condition";
import type { ConditionsEntityContext } from "./context";
import { conditionsEntityContext } from "./context";
import "./ha-card-condition-editor";
import {
  type HaCardConditionEditor,
  getConditionClassName,
  usesAutomationConditionEditor,
} from "./ha-card-condition-editor";
import type { LovelaceConditionEditorConstructor } from "./types";
import "./types/ha-card-condition-and";
import "./types/ha-card-condition-location";
import "./types/ha-card-condition-not";
import "./types/ha-card-condition-numeric_state-no_entity";
import "./types/ha-card-condition-or";
import "./types/ha-card-condition-screen";
import "./types/ha-card-condition-state-no_entity";
import "./types/ha-card-condition-time";
import "./types/ha-card-condition-user";

const UI_CONDITION = [
  "location",
  "numeric_state",
  "state",
  "screen",
  "time",
  "user",
  // Server-class types, edited via the automation condition editors.
  "template",
  "sun",
  "zone",
  "device",
  "and",
  "not",
  "or",
] as const satisfies readonly string[];

@customElement("ha-card-conditions-editor")
export class HaCardConditionsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @storage({
    key: "dashboardConditionClipboard",
    state: false,
    subscribe: false,
    storage: "sessionStorage",
  })
  protected _clipboard?: VisibilityCondition;

  @property({ attribute: false }) public conditions!: VisibilityCondition[];

  @state()
  @consume({ context: conditionsEntityContext, subscribe: true })
  private _entityContext?: ConditionsEntityContext;

  private get _noEntity(): boolean {
    return this._entityContext?.mode === "filter";
  }

  private _focusLastConditionOnChange = false;

  @state() private _rowSortSelected?: number;

  private _conditionKeys = new WeakMap<VisibilityCondition, number>();

  private _nextConditionKey = 0;

  private _getKey(condition: VisibilityCondition): number {
    if (!this._conditionKeys.has(condition)) {
      this._conditionKeys.set(condition, this._nextConditionKey++);
    }

    return this._conditionKeys.get(condition)!;
  }

  protected firstUpdated() {
    // The reused automation condition editors (state / numeric_state / template
    // / sun / zone / device) label their form fields from the `config`
    // translation fragment, which the dashboard editor does not otherwise load.
    this.hass.loadFragmentTranslation("config");

    // Expand the condition if there is only one
    if (this.conditions.length === 1) {
      const row = this.shadowRoot!.querySelector<HaCardConditionEditor>(
        "ha-card-condition-editor"
      )!;
      row.updateComplete.then(() => {
        row.expand();
      });
    }
  }

  protected updated(changedProperties: PropertyValues<this>) {
    if (!changedProperties.has("conditions")) {
      return;
    }

    if (this._focusLastConditionOnChange) {
      this._focusLastConditionOnChange = false;
      const row = this.shadowRoot!.querySelector<HaCardConditionEditor>(
        "ha-card-condition-editor:last-of-type"
      )!;
      row.updateComplete.then(() => {
        row.expand();
        row.scrollIntoView();
        row.focus();
      });
    }
  }

  protected render() {
    return html`
      <ha-sortable
        handle-selector=".handle"
        draggable-selector="ha-card-condition-editor"
        group="lovelace-conditions"
        invert-swap
        @item-moved=${this._conditionMoved}
        @item-added=${this._conditionAdded}
        @item-removed=${this._conditionRemoved}
      >
        <div class="conditions">
          ${repeat(
            this.conditions,
            (condition) => this._getKey(condition),
            (cond, idx) => html`
              <ha-card-condition-editor
                .sortableData=${cond}
                .index=${idx}
                .first=${idx === 0}
                .last=${idx === this.conditions.length - 1}
                @duplicate-condition=${this._duplicateCondition}
                @move-down=${this._moveDown}
                @move-up=${this._moveUp}
                @value-changed=${this._conditionChanged}
                .hass=${this.hass}
                .condition=${cond}
              >
                <div
                  slot="drag-handle"
                  class="handle ${
                    this._rowSortSelected === idx ? "active" : ""
                  }"
                  role="button"
                  tabindex="0"
                  aria-label=${this.hass.localize("ui.common.move")}
                  aria-pressed=${this._rowSortSelected === idx}
                  .index=${idx}
                  @click=${stopPropagation}
                  @keydown=${this._handleDragKeydown}
                >
                  <ha-svg-icon .path=${mdiDragHorizontalVariant}></ha-svg-icon>
                </div>
              </ha-card-condition-editor>
            `
          )}
          <div>
            <ha-dropdown @wa-select=${this._addCondition}>
              <ha-button slot="trigger" appearance="filled">
                <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.condition-editor.add"
                )}
              </ha-button>
              ${
                this._clipboard
                  ? html`
                      <ha-dropdown-item value="paste">
                        ${this.hass.localize(
                          "ui.panel.lovelace.editor.edit_card.paste_condition"
                        )}
                        <ha-svg-icon
                          slot="icon"
                          .path=${mdiContentPaste}
                        ></ha-svg-icon>
                      </ha-dropdown-item>
                    `
                  : nothing
              }
              ${UI_CONDITION.map(
                (condition) => html`
                  <ha-dropdown-item .value=${condition}>
                    ${
                      this.hass!.localize(
                        `ui.panel.lovelace.editor.condition-editor.condition.${condition}.label`
                      ) || condition
                    }
                    <ha-svg-icon
                      slot="icon"
                      .path=${ICON_CONDITION[condition]}
                    ></ha-svg-icon>
                  </ha-dropdown-item>
                `
              )}
            </ha-dropdown>
          </div>
        </div>
      </ha-sortable>
    `;
  }

  private _move(oldIndex: number, newIndex: number) {
    const conditions = [...this.conditions];
    const condition = conditions.splice(oldIndex, 1)[0];
    conditions.splice(newIndex, 0, condition);
    this.conditions = conditions;
    if (this._rowSortSelected === oldIndex) {
      this._rowSortSelected = newIndex;
    } else if (
      this._rowSortSelected !== undefined &&
      oldIndex < this._rowSortSelected &&
      newIndex >= this._rowSortSelected
    ) {
      this._rowSortSelected--;
    } else if (
      this._rowSortSelected !== undefined &&
      oldIndex > this._rowSortSelected &&
      newIndex <= this._rowSortSelected
    ) {
      this._rowSortSelected++;
    }
    fireEvent(this, "value-changed", { value: conditions });
  }

  private _conditionMoved(ev: CustomEvent) {
    ev.stopPropagation();
    this._move(ev.detail.oldIndex, ev.detail.newIndex);
  }

  private async _conditionAdded(ev: CustomEvent) {
    ev.stopPropagation();
    const { index, data } = ev.detail;
    if (this._rowSortSelected !== undefined && index <= this._rowSortSelected) {
      this._rowSortSelected++;
    }
    let conditions = [...this.conditions];
    conditions.splice(index, 0, data);
    this.conditions = conditions;
    await nextRender();
    if (this.conditions !== conditions && !this.conditions.includes(data)) {
      conditions = [...this.conditions];
      conditions.splice(index, 0, data);
    } else {
      conditions = this.conditions;
    }
    fireEvent(this, "value-changed", { value: conditions });
  }

  private async _conditionRemoved(ev: CustomEvent) {
    ev.stopPropagation();
    const { index: removedIndex } = ev.detail;
    const removed = this.conditions[removedIndex];
    if (this._rowSortSelected === removedIndex) {
      this._rowSortSelected = undefined;
    } else if (
      this._rowSortSelected !== undefined &&
      removedIndex < this._rowSortSelected
    ) {
      this._rowSortSelected--;
    }
    let conditions = [...this.conditions];
    conditions.splice(removedIndex, 1);
    this.conditions = conditions;
    await nextRender();
    if (this.conditions !== conditions) {
      conditions = [...this.conditions];
      const index = conditions.indexOf(removed);
      if (index !== -1) {
        conditions.splice(index, 1);
      }
    }
    fireEvent(this, "value-changed", { value: conditions });
  }

  private _moveUp(ev: CustomEvent) {
    ev.stopPropagation();
    const row = ev.currentTarget as HaCardConditionEditor;
    if (!row.first) {
      this._move(row.index, row.index - 1);
    }
  }

  private _moveDown(ev: CustomEvent) {
    ev.stopPropagation();
    const row = ev.currentTarget as HaCardConditionEditor;
    if (!row.last) {
      this._move(row.index, row.index + 1);
    }
  }

  private _handleDragKeydown(ev: KeyboardEvent) {
    const handle = ev.currentTarget as HTMLElement & { index: number };
    const selected = this._rowSortSelected === handle.index;

    if (ev.key === "Escape" && selected) {
      ev.preventDefault();
      ev.stopPropagation();
      this._rowSortSelected = undefined;
      return;
    }

    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      ev.stopPropagation();
      this._rowSortSelected = selected ? undefined : handle.index;
      return;
    }

    if (
      (selected || ev.altKey) &&
      !ev.ctrlKey &&
      !ev.metaKey &&
      !ev.shiftKey &&
      (ev.key === "ArrowUp" || ev.key === "ArrowDown")
    ) {
      ev.preventDefault();
      ev.stopPropagation();
      const newIndex =
        ev.key === "ArrowUp" ? handle.index - 1 : handle.index + 1;
      if (newIndex < 0 || newIndex >= this.conditions.length) {
        return;
      }
      this._move(handle.index, newIndex);
      handle.focus();
    }
  }

  private _addCondition(ev: HaDropdownSelectEvent) {
    const value = ev.detail.item.value as string;
    const conditions = [...this.conditions];

    if (!value || (value === "paste" && !this._clipboard)) {
      return;
    }

    if (value === "paste") {
      const newCondition = deepClone(this._clipboard!);
      conditions.push(newCondition);
    } else if (usesAutomationConditionEditor(value, this._noEntity)) {
      // Authored in core format via the automation condition editors (server
      // types, plus state/numeric_state outside entity-filter mode); seed with
      // that editor's default config.
      const elClass = customElements.get(`ha-automation-condition-${value}`) as
        { defaultConfig?: object } | undefined;
      const defaultConfig = elClass?.defaultConfig;
      conditions.push(
        (defaultConfig
          ? { ...defaultConfig }
          : { condition: value }) as VisibilityCondition
      );
    } else {
      const condition = value as Condition["condition"];
      const elClass = customElements.get(
        getConditionClassName(condition, this._noEntity)
      ) as LovelaceConditionEditorConstructor | undefined;

      const defaultConfig = elClass?.defaultConfig;
      conditions.push(defaultConfig ? { ...defaultConfig } : { condition });
    }

    this._focusLastConditionOnChange = true;
    fireEvent(this, "value-changed", { value: conditions });
  }

  private _duplicateCondition(ev: CustomEvent) {
    const conditions = [...this.conditions];
    conditions.push(ev.detail.value);
    fireEvent(this, "value-changed", { value: conditions });
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const conditions = [...this.conditions];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      conditions.splice(index, 1);
      if (this._rowSortSelected === index) {
        this._rowSortSelected = undefined;
      } else if (
        this._rowSortSelected !== undefined &&
        index < this._rowSortSelected
      ) {
        this._rowSortSelected--;
      }
    } else {
      this._conditionKeys.set(newValue, this._getKey(conditions[index]));
      conditions[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: conditions });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-alert {
          display: block;
          margin-top: 12px;
        }
        ha-card-condition-editor {
          display: block;
          margin-top: 12px;
          scroll-margin-top: 48px;
        }
        .handle {
          padding: var(--ha-space-1);
          cursor: move;
          cursor: grab;
          border-radius: var(--ha-border-radius-pill);
        }
        .handle:focus {
          outline: var(--wa-focus-ring);
          background: var(--ha-color-fill-neutral-quiet-resting);
        }
        .handle.active {
          outline: var(--wa-focus-ring);
          background: var(--ha-color-fill-neutral-normal-active);
        }
        .handle ha-svg-icon {
          display: block;
          pointer-events: none;
        }
        ha-dropdown {
          display: inline-block;
          margin-top: var(--ha-space-3);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-conditions-editor": HaCardConditionsEditor;
  }
}
