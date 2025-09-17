import { mdiDrag, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { PropertyValues } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, queryAll, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { nextRender } from "../../../../common/util/render-status";
import "../../../../components/ha-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import {
  ACTION_BUILDING_BLOCKS,
  getService,
  isService,
} from "../../../../data/action";
import type { AutomationClipboard } from "../../../../data/automation";
import type { Action } from "../../../../data/script";
import type { HomeAssistant } from "../../../../types";
import {
  PASTE_VALUE,
  VIRTUAL_ACTIONS,
  showAddAutomationElementDialog,
} from "../show-add-automation-element-dialog";
import { automationRowsStyles } from "../styles";
import type HaAutomationActionRow from "./ha-automation-action-row";
import { getAutomationActionType } from "./ha-automation-action-row";
import { ensureArray } from "../../../../common/array/ensure-array";

@customElement("ha-automation-action")
export default class HaAutomationAction extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public root = false;

  @property({ attribute: false }) public actions!: Action[];

  @property({ attribute: false }) public highlightedActions?: Action[];

  @property({ type: Boolean, attribute: "sidebar" }) public optionsInSidebar =
    false;

  @state() private _rowSortSelected?: number;

  @state()
  @storage({
    key: "automationClipboard",
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: AutomationClipboard;

  @queryAll("ha-automation-action-row")
  private _actionRowElements?: HaAutomationActionRow[];

  private _focusLastActionOnChange = false;

  private _focusActionIndexOnChange?: number;

  private _actionKeys = new WeakMap<Action, string>();

  protected render() {
    return html`
      <ha-sortable
        handle-selector=".handle"
        draggable-selector="ha-automation-action-row"
        .disabled=${this.disabled}
        group="actions"
        invert-swap
        @item-moved=${this._actionMoved}
        @item-added=${this._actionAdded}
        @item-removed=${this._actionRemoved}
      >
        <div class="rows ${!this.optionsInSidebar ? "no-sidebar" : ""}">
          ${repeat(
            this.actions,
            (action) => this._getKey(action),
            (action, idx) => html`
              <ha-automation-action-row
                .root=${this.root}
                .sortableData=${action}
                .index=${idx}
                .first=${idx === 0}
                .last=${idx === this.actions.length - 1}
                .action=${action}
                .narrow=${this.narrow}
                .disabled=${this.disabled}
                @duplicate=${this._duplicateAction}
                @insert-after=${this._insertAfter}
                @move-down=${this._moveDown}
                @move-up=${this._moveUp}
                @value-changed=${this._actionChanged}
                .hass=${this.hass}
                .highlight=${this.highlightedActions?.includes(action)}
                .optionsInSidebar=${this.optionsInSidebar}
                .sortSelected=${this._rowSortSelected === idx}
                @stop-sort-selection=${this._stopSortSelection}
              >
                ${!this.disabled
                  ? html`
                      <div
                        tabindex="0"
                        class="handle ${this._rowSortSelected === idx
                          ? "active"
                          : ""}"
                        slot="icons"
                        @keydown=${this._handleDragKeydown}
                        .index=${idx}
                      >
                        <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                      </div>
                    `
                  : nothing}
              </ha-automation-action-row>
            `
          )}
          <div class="buttons">
            <ha-button
              .disabled=${this.disabled}
              @click=${this._addActionDialog}
              .appearance=${this.root ? "accent" : "filled"}
              .size=${this.root ? "medium" : "small"}
            >
              <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.add"
              )}
            </ha-button>
            <ha-button
              .disabled=${this.disabled}
              @click=${this._addActionBuildingBlockDialog}
              appearance="plain"
              .size=${this.root ? "medium" : "small"}
            >
              <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.add_building_block"
              )}
            </ha-button>
          </div>
        </div>
      </ha-sortable>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (
      changedProps.has("actions") &&
      (this._focusLastActionOnChange ||
        this._focusActionIndexOnChange !== undefined)
    ) {
      const mode = this._focusLastActionOnChange ? "new" : "moved";

      const row = this.shadowRoot!.querySelector<HaAutomationActionRow>(
        `ha-automation-action-row:${mode === "new" ? "last-of-type" : `nth-of-type(${this._focusActionIndexOnChange! + 1})`}`
      )!;

      this._focusLastActionOnChange = false;
      this._focusActionIndexOnChange = undefined;

      row.updateComplete.then(() => {
        // on new condition open the settings in the sidebar, except for building blocks
        const type = getAutomationActionType(row.action);
        if (
          type &&
          this.optionsInSidebar &&
          (!ACTION_BUILDING_BLOCKS.includes(type) || mode === "moved")
        ) {
          row.openSidebar();
          if (this.narrow) {
            row.scrollIntoView({
              block: "start",
              behavior: "smooth",
            });
          }
        }

        if (mode === "new") {
          row.expand();
        }

        if (!this.optionsInSidebar) {
          row.focus();
        }
      });
    }
  }

  public expandAll() {
    this._actionRowElements?.forEach((row) => {
      row.expandAll();
    });
  }

  public collapseAll() {
    this._actionRowElements?.forEach((row) => {
      row.collapseAll();
    });
  }

  private _addActionDialog() {
    if (this.narrow) {
      fireEvent(this, "request-close-sidebar");
    }

    showAddAutomationElementDialog(this, {
      type: "action",
      add: this._addAction,
      clipboardItem: getAutomationActionType(this._clipboard?.action),
    });
  }

  private _addActionBuildingBlockDialog() {
    showAddAutomationElementDialog(this, {
      type: "action",
      add: this._addAction,
      clipboardItem: getAutomationActionType(this._clipboard?.action),
      group: "building_blocks",
    });
  }

  private _addAction = (action: string) => {
    let actions: Action[];
    if (action === PASTE_VALUE) {
      actions = this.actions.concat(deepClone(this._clipboard!.action));
    } else if (action in VIRTUAL_ACTIONS) {
      actions = this.actions.concat(VIRTUAL_ACTIONS[action]);
    } else if (isService(action)) {
      actions = this.actions.concat({
        action: getService(action),
        metadata: {},
      });
    } else {
      const elClass = customElements.get(
        `ha-automation-action-${action}`
      ) as CustomElementConstructor & { defaultConfig: Action };
      actions = this.actions.concat(
        elClass ? { ...elClass.defaultConfig } : { [action]: {} }
      );
    }
    this._focusLastActionOnChange = true;
    fireEvent(this, "value-changed", { value: actions });
  };

  private _getKey(action: Action) {
    if (!this._actionKeys.has(action)) {
      this._actionKeys.set(action, Math.random().toString());
    }

    return this._actionKeys.get(action)!;
  }

  private async _moveUp(ev) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    if (!(ev.target as HaAutomationActionRow).first) {
      const newIndex = index - 1;
      this._move(index, newIndex);
      if (this._rowSortSelected === index) {
        this._rowSortSelected = newIndex;
      }
      ev.target.focus();
    }
  }

  private async _moveDown(ev) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    if (!(ev.target as HaAutomationActionRow).last) {
      const newIndex = index + 1;
      this._move(index, newIndex);
      if (this._rowSortSelected === index) {
        this._rowSortSelected = newIndex;
      }
      ev.target.focus();
    }
  }

  private _move(oldIndex: number, newIndex: number) {
    const actions = this.actions.concat();
    const item = actions.splice(oldIndex, 1)[0];
    actions.splice(newIndex, 0, item);
    this.actions = actions;
    fireEvent(this, "value-changed", { value: actions });
  }

  private _actionMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    this._move(oldIndex, newIndex);
  }

  private async _actionAdded(ev: CustomEvent): Promise<void> {
    ev.stopPropagation();
    const { index, data } = ev.detail;
    const item = ev.detail.item as HaAutomationActionRow;
    const selected = item.selected;

    let actions = [
      ...this.actions.slice(0, index),
      data,
      ...this.actions.slice(index),
    ];
    // Add action locally to avoid UI jump
    this.actions = actions;
    if (selected) {
      this._focusActionIndexOnChange = actions.length === 1 ? 0 : index;
    }
    await nextRender();
    if (this.actions !== actions) {
      // Ensure action is added even after update
      actions = [
        ...this.actions.slice(0, index),
        data,
        ...this.actions.slice(index),
      ];
      if (selected) {
        this._focusActionIndexOnChange = actions.length === 1 ? 0 : index;
      }
    }
    fireEvent(this, "value-changed", { value: actions });
  }

  private async _actionRemoved(ev: CustomEvent): Promise<void> {
    ev.stopPropagation();
    const { index } = ev.detail;
    const action = this.actions[index];
    // Remove action locally to avoid UI jump
    this.actions = this.actions.filter((a) => a !== action);
    await nextRender();
    // Ensure action is removed even after update
    const actions = this.actions.filter((a) => a !== action);
    fireEvent(this, "value-changed", { value: actions });
  }

  private _actionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const actions = [...this.actions];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      actions.splice(index, 1);
    } else {
      // Store key on new value.
      const key = this._getKey(actions[index]);
      this._actionKeys.set(newValue, key);

      actions[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: actions });
  }

  private _duplicateAction(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    fireEvent(this, "value-changed", {
      // @ts-expect-error Requires library bump to ES2023
      value: this.actions.toSpliced(
        index + 1,
        0,
        deepClone(this.actions[index])
      ),
    });
  }

  private _insertAfter(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    const inserted = ensureArray(ev.detail.value);
    this.highlightedActions = inserted;
    fireEvent(this, "value-changed", {
      // @ts-expect-error Requires library bump to ES2023
      value: this.actions.toSpliced(index + 1, 0, ...inserted),
    });
  }

  private _handleDragKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.stopPropagation();
      this._rowSortSelected =
        this._rowSortSelected === undefined
          ? (ev.target as any).index
          : undefined;
    }
  }

  private _stopSortSelection() {
    this._rowSortSelected = undefined;
  }

  static styles = automationRowsStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action": HaAutomationAction;
  }
}
