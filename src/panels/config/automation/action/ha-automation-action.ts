import { mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, queryAll } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import {
  ACTION_BUILDING_BLOCKS,
  VIRTUAL_ACTIONS,
} from "../../../../data/action";
import { getValueFromDynamic, isDynamic } from "../../../../data/automation";
import type { Action } from "../../../../data/script";
import { EDITOR_SAVE_FAB_TOAST_BOTTOM_OFFSET } from "../editor-toast";
import {
  PASTE_VALUE,
  showAddAutomationElementDialog,
} from "../show-add-automation-element-dialog";
import { AutomationSortableListMixin } from "../ha-automation-sortable-list-mixin";
import { automationRowsStyles } from "../styles";
import type HaAutomationActionRow from "./ha-automation-action-row";
import { getAutomationActionType } from "./ha-automation-action-row";

@customElement("ha-automation-action")
export default class HaAutomationAction extends AutomationSortableListMixin<Action>(
  LitElement
) {
  @property({ type: Boolean }) public root = false;

  @property({ type: Boolean, attribute: false }) public editorDirty = false;

  @property({ attribute: false }) public actions!: Action[];

  @property({ attribute: false }) public highlightedActions?: Action[];

  @queryAll("ha-automation-action-row")
  private _actionRowElements?: HaAutomationActionRow[];

  protected get items(): Action[] {
    return this.actions;
  }

  protected set items(items: Action[]) {
    this.actions = items;
  }

  protected setHighlightedItems(items: Action[]) {
    this.highlightedActions = items;
  }

  protected render() {
    return html`
      <ha-sortable
        handle-selector=".handle"
        draggable-selector="ha-automation-action-row"
        .disabled=${this.disabled}
        group="actions"
        invert-swap
        @item-moved=${this.itemMoved}
        @item-added=${this.itemAdded}
        @item-removed=${this.itemRemoved}
      >
        <div class="rows ${!this.optionsInSidebar ? "no-sidebar" : ""}">
          ${repeat(
            this.actions,
            (action) => this.getKey(action),
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
                @duplicate=${this.duplicateItem}
                @paste=${this.pasteItem}
                @insert-after=${this.insertAfter}
                @move-down=${this.moveDown}
                @move-up=${this.moveUp}
                @value-changed=${this.itemChanged}
                .hass=${this.hass}
                .highlight=${this.highlightedActions?.includes(action)}
                .optionsInSidebar=${this.optionsInSidebar}
                .sortSelected=${this.rowSortSelected === idx}
                @stop-sort-selection=${this.stopSortSelection}
              >
                ${!this.disabled
                  ? html`
                      <div
                        tabindex="0"
                        class="handle ${this.rowSortSelected === idx
                          ? "active"
                          : ""}"
                        slot="icons"
                        @keydown=${this.handleDragKeydown}
                        @click=${stopPropagation}
                        .index=${idx}
                      >
                        <ha-svg-icon
                          .path=${mdiDragHorizontalVariant}
                        ></ha-svg-icon>
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
          </div>
        </div>
      </ha-sortable>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (
      changedProps.has("actions") &&
      (this.focusLastItemOnChange || this.focusItemIndexOnChange !== undefined)
    ) {
      const mode = this.focusLastItemOnChange ? "new" : "moved";

      const row = this.shadowRoot!.querySelector<HaAutomationActionRow>(
        `ha-automation-action-row:${mode === "new" ? "last-of-type" : `nth-of-type(${this.focusItemIndexOnChange! + 1})`}`
      )!;

      this.focusLastItemOnChange = false;
      this.focusItemIndexOnChange = undefined;

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
          row.markAsNew();
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
      clipboardPasteToastBottomOffset: this.editorDirty
        ? EDITOR_SAVE_FAB_TOAST_BOTTOM_OFFSET
        : undefined,
    });
  }

  private _addAction = (action: string, target?: HassServiceTarget) => {
    let actions: Action[];
    if (action === PASTE_VALUE) {
      actions = this.actions.concat(deepClone(this._clipboard!.action!));
    } else if (action in VIRTUAL_ACTIONS) {
      actions = this.actions.concat(VIRTUAL_ACTIONS[action]);
    } else if (isDynamic(action)) {
      actions = this.actions.concat({
        action: getValueFromDynamic(action),
        metadata: {},
        target,
      });
    } else {
      const elClass = customElements.get(
        `ha-automation-action-${action}`
      ) as CustomElementConstructor & { defaultConfig: Action };
      actions = this.actions.concat(
        elClass ? { ...elClass.defaultConfig } : { [action]: {} }
      );
    }
    this.focusLastItemOnChange = true;
    fireEvent(this, "value-changed", { value: actions });
  };

  static styles = automationRowsStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action": HaAutomationAction;
  }
}
