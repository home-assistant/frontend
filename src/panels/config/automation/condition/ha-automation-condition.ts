import { mdiDrag, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { listenMediaQuery } from "../../../../common/dom/media_query";
import { nestedArrayMove } from "../../../../common/util/array-move";
import "../../../../components/ha-button";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import type {
  AutomationClipboard,
  Condition,
} from "../../../../data/automation";
import type { HomeAssistant, ItemPath } from "../../../../types";
import {
  PASTE_VALUE,
  showAddAutomationElementDialog,
} from "../show-add-automation-element-dialog";
import "./ha-automation-condition-row";
import type HaAutomationConditionRow from "./ha-automation-condition-row";

@customElement("ha-automation-condition")
export default class HaAutomationCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public conditions!: Condition[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Array }) public path?: ItemPath;

  @state() private _showReorder: boolean = false;

  @storage({
    key: "automationClipboard",
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: AutomationClipboard;

  private _focusLastConditionOnChange = false;

  private _conditionKeys = new WeakMap<Condition, string>();

  private _unsubMql?: () => void;

  public connectedCallback() {
    super.connectedCallback();
    this._unsubMql = listenMediaQuery("(min-width: 600px)", (matches) => {
      this._showReorder = matches;
    });
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubMql?.();
    this._unsubMql = undefined;
  }

  protected updated(changedProperties: PropertyValues) {
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

  private get nested() {
    return this.path !== undefined;
  }

  protected render() {
    if (!Array.isArray(this.conditions)) {
      return nothing;
    }
    return html`
      <ha-sortable
        handle-selector=".handle"
        .disabled=${!this._showReorder || this.disabled}
        @item-moved=${this._conditionMoved}
        group="conditions"
        .path=${this.path}
        invert-swap
      >
        <div class="conditions">
          ${repeat(
            this.conditions.filter((c) => typeof c === "object"),
            (condition) => this._getKey(condition),
            (cond, idx) => html`
              <ha-automation-condition-row
                .path=${[...(this.path ?? []), idx]}
                .index=${idx}
                .first=${idx === 0}
                .last=${idx === this.conditions.length - 1}
                .totalConditions=${this.conditions.length}
                .condition=${cond}
                .disabled=${this.disabled}
                @duplicate=${this._duplicateCondition}
                @move-down=${this._moveDown}
                @move-up=${this._moveUp}
                @value-changed=${this._conditionChanged}
                .hass=${this.hass}
              >
                ${this._showReorder && !this.disabled
                  ? html`
                      <div class="handle" slot="icons">
                        <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                      </div>
                    `
                  : nothing}
              </ha-automation-condition-row>
            `
          )}
        </div>
      </ha-sortable>
      <div class="buttons">
        <ha-button
          outlined
          .disabled=${this.disabled}
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.add"
          )}
          @click=${this._addConditionDialog}
        >
          <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
        </ha-button>
        <ha-button
          .disabled=${this.disabled}
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.add_building_block"
          )}
          @click=${this._addConditionBuildingBlockDialog}
        >
          <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
        </ha-button>
      </div>
    `;
  }

  private _addConditionDialog() {
    showAddAutomationElementDialog(this, {
      type: "condition",
      add: this._addCondition,
      clipboardItem: this._clipboard?.condition?.condition,
    });
  }

  private _addConditionBuildingBlockDialog() {
    showAddAutomationElementDialog(this, {
      type: "condition",
      add: this._addCondition,
      clipboardItem: this._clipboard?.condition?.condition,
      group: "building_blocks",
    });
  }

  private _addCondition = (value) => {
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
  };

  private _getKey(condition: Condition) {
    if (!this._conditionKeys.has(condition)) {
      this._conditionKeys.set(condition, Math.random().toString());
    }

    return this._conditionKeys.get(condition)!;
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

  private _move(
    oldIndex: number,
    newIndex: number,
    oldPath?: ItemPath,
    newPath?: ItemPath
  ) {
    const conditions = nestedArrayMove(
      this.conditions,
      oldIndex,
      newIndex,
      oldPath,
      newPath
    );

    fireEvent(this, "value-changed", { value: conditions });
  }

  private _conditionMoved(ev: CustomEvent): void {
    if (this.nested) return;
    ev.stopPropagation();
    const { oldIndex, newIndex, oldPath, newPath } = ev.detail;
    this._move(oldIndex, newIndex, oldPath, newPath);
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

    this.conditions = conditions;

    fireEvent(this, "value-changed", { value: conditions });
  }

  private _duplicateCondition(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    fireEvent(this, "value-changed", {
      value: this.conditions.concat(deepClone(this.conditions[index])),
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      .conditions {
        padding: 16px;
        margin: -16px -16px 0px -16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .conditions:not(:has(ha-automation-condition-row)) {
        margin: -16px;
      }
      .sortable-ghost {
        background: none;
        border-radius: var(--ha-card-border-radius, 12px);
      }
      .sortable-drag {
        background: none;
      }
      ha-automation-condition-row {
        display: block;
        scroll-margin-top: 48px;
      }
      ha-svg-icon {
        height: 20px;
      }
      .handle {
        padding: 12px;
        cursor: move; /* fallback if grab cursor is unsupported */
        cursor: grab;
      }
      .handle ha-svg-icon {
        pointer-events: none;
        height: 24px;
      }
      .buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition": HaAutomationCondition;
  }
}
