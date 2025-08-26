import { mdiDrag, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { listenMediaQuery } from "../../../../common/dom/media_query";
import { nextRender } from "../../../../common/util/render-status";
import "../../../../components/ha-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import {
  ACTION_BUILDING_BLOCKS,
  ACTION_COMBINED_BLOCKS,
  getService,
  isService,
} from "../../../../data/action";
import type { AutomationClipboard } from "../../../../data/automation";
import type { Action } from "../../../../data/script";
import type { HomeAssistant } from "../../../../types";
import type HaAutomationCondition from "../condition/ha-automation-condition";
import type HaAutomationOption from "../option/ha-automation-option";
import {
  PASTE_VALUE,
  VIRTUAL_ACTIONS,
  showAddAutomationElementDialog,
} from "../show-add-automation-element-dialog";
import type HaAutomationActionEditor from "./ha-automation-action-editor";
import type HaAutomationActionRow from "./ha-automation-action-row";
import { getAutomationActionType } from "./ha-automation-action-row";

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

  @state() private _showReorder = false;

  @state()
  @storage({
    key: "automationClipboard",
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: AutomationClipboard;

  private _focusLastActionOnChange = false;

  private _actionKeys = new WeakMap<Action, string>();

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

  protected render() {
    return html`
      <ha-sortable
        handle-selector=".handle"
        draggable-selector="ha-automation-action-row"
        .disabled=${!this._showReorder || this.disabled}
        group="actions"
        invert-swap
        @item-moved=${this._actionMoved}
        @item-added=${this._actionAdded}
        @item-removed=${this._actionRemoved}
      >
        <div class="actions">
          ${repeat(
            this.actions,
            (action) => this._getKey(action),
            (action, idx) => html`
              <ha-automation-action-row
                .sortableData=${action}
                .index=${idx}
                .first=${idx === 0}
                .last=${idx === this.actions.length - 1}
                .action=${action}
                .narrow=${this.narrow}
                .disabled=${this.disabled}
                @duplicate=${this._duplicateAction}
                @move-down=${this._moveDown}
                @move-up=${this._moveUp}
                @value-changed=${this._actionChanged}
                .hass=${this.hass}
                ?highlight=${this.highlightedActions?.includes(action)}
                .optionsInSidebar=${this.optionsInSidebar}
              >
                ${this._showReorder && !this.disabled
                  ? html`
                      <div class="handle" slot="icons">
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

    if (changedProps.has("actions") && this._focusLastActionOnChange) {
      this._focusLastActionOnChange = false;

      const row = this.shadowRoot!.querySelector<HaAutomationActionRow>(
        "ha-automation-action-row:last-of-type"
      )!;
      row.updateComplete.then(() => {
        // on new condition open the settings in the sidebar, except for building blocks
        const type = getAutomationActionType(row.action);
        if (
          type &&
          this.optionsInSidebar &&
          !ACTION_BUILDING_BLOCKS.includes(type)
        ) {
          row.openSidebar();
          if (this.narrow) {
            row.scrollIntoView({
              block: "start",
              behavior: "smooth",
            });
          }
        } else if (!this.optionsInSidebar) {
          row.expand();
        }
        row.focus();
      });
    }
  }

  private _getRowElements() {
    return this.shadowRoot!.querySelectorAll<HaAutomationActionRow>(
      "ha-automation-action-row"
    );
  }

  private _getChildCollapsableElements(
    row: HaAutomationActionRow
  ):
    | NodeListOf<
        HaAutomationAction | HaAutomationCondition | HaAutomationOption
      >
    | undefined {
    const editor = row.shadowRoot!.querySelector<HaAutomationActionEditor>(
      "ha-automation-action-editor"
    );
    if (editor) {
      const buildingBlock = editor.shadowRoot?.querySelector(
        [...ACTION_BUILDING_BLOCKS, ...ACTION_COMBINED_BLOCKS]
          .map((block) => `ha-automation-action-${block}`)
          .join(", ")
      );
      if (buildingBlock) {
        return buildingBlock.shadowRoot?.querySelectorAll<
          HaAutomationAction | HaAutomationCondition | HaAutomationOption
        >(
          "ha-automation-action, ha-automation-condition, ha-automation-option"
        );
      }
    }
    return undefined;
  }

  public expandAll() {
    this._getRowElements().forEach((row) => {
      row.expand?.();

      const childElements = this._getChildCollapsableElements(row);
      if (childElements) {
        childElements.forEach((element) => {
          element.expandAll?.();
        });
      }
    });
  }

  public collapseAll() {
    this._getRowElements().forEach((row) => {
      row.collapse();

      const childElements = this._getChildCollapsableElements(row);
      if (childElements) {
        childElements.forEach((element) => {
          element.collapseAll?.();
        });
      }
    });
  }

  private _addActionDialog() {
    if (this.narrow) {
      fireEvent(this, "close-sidebar");
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

  private _moveUp(ev) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    const newIndex = index - 1;
    this._move(index, newIndex);
  }

  private _moveDown(ev) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    const newIndex = index + 1;
    this._move(index, newIndex);
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
    let actions = [
      ...this.actions.slice(0, index),
      data,
      ...this.actions.slice(index),
    ];
    // Add action locally to avoid UI jump
    this.actions = actions;
    await nextRender();
    if (this.actions !== actions) {
      // Ensure action is added even after update
      actions = [
        ...this.actions.slice(0, index),
        data,
        ...this.actions.slice(index),
      ];
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
    fireEvent(this, "close-sidebar");
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
      value: this.actions.concat(deepClone(this.actions[index])),
    });
  }

  static styles = css`
    .actions {
      padding: 16px 0 16px 16px;
      margin: -16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    :host([root]) .actions {
      padding-right: 8px;
    }
    .sortable-ghost {
      background: none;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
    }
    .sortable-drag {
      background: none;
    }
    ha-automation-action-row {
      display: block;
      scroll-margin-top: 48px;
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
      order: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action": HaAutomationAction;
  }
}
