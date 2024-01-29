import { consume } from "@lit-labs/context";
import { mdiArrowDown, mdiArrowUp, mdiDrag, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import { CSSResultGroup, LitElement, PropertyValues, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { nestedArrayMove } from "../../../../common/util/array-move";
import "../../../../components/ha-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import { getService, isService } from "../../../../data/action";
import type { AutomationClipboard } from "../../../../data/automation";
import { Action } from "../../../../data/script";
import {
  ReorderMode,
  reorderModeContext,
} from "../../../../state/reorder-mode-mixin";
import { HomeAssistant, ItemPath } from "../../../../types";
import {
  PASTE_VALUE,
  showAddAutomationElementDialog,
} from "../show-add-automation-element-dialog";
import type HaAutomationActionRow from "./ha-automation-action-row";
import { getType } from "./ha-automation-action-row";

@customElement("ha-automation-action")
export default class HaAutomationAction extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Array }) public path?: ItemPath;

  @property({ attribute: false }) public actions!: Action[];

  @state()
  @consume({ context: reorderModeContext, subscribe: true })
  private _reorderMode?: ReorderMode;

  @storage({
    key: "automationClipboard",
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: AutomationClipboard;

  private _focusLastActionOnChange = false;

  private _actionKeys = new WeakMap<Action, string>();

  private get nested() {
    return this.path !== undefined;
  }

  protected render() {
    return html`
      <ha-sortable
        handle-selector=".handle"
        .disabled=${!this._reorderMode?.active}
        @item-moved=${this._actionMoved}
        group="actions"
        .path=${this.path}
      >
        <div class="actions">
          ${repeat(
            this.actions,
            (action) => this._getKey(action),
            (action, idx) => html`
              <ha-automation-action-row
                .path=${[...(this.path ?? []), idx]}
                .index=${idx}
                .action=${action}
                .narrow=${this.narrow}
                .disabled=${this.disabled}
                .hideMenu=${Boolean(this._reorderMode?.active)}
                @duplicate=${this._duplicateAction}
                @value-changed=${this._actionChanged}
                .hass=${this.hass}
              >
                ${this._reorderMode?.active
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
                        .disabled=${idx === this.actions.length - 1}
                      ></ha-icon-button>
                      <div class="handle" slot="icons">
                        <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                      </div>
                    `
                  : ""}
              </ha-automation-action-row>
            `
          )}
        </div>
      </ha-sortable>
      <div class="buttons">
        <ha-button
          outlined
          .disabled=${this.disabled}
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.actions.add"
          )}
          @click=${this._addActionDialog}
        >
          <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
        </ha-button>
        <ha-button
          .disabled=${this.disabled}
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.actions.add_building_block"
          )}
          @click=${this._addActionBuildingBlockDialog}
        >
          <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
        </ha-button>
      </div>
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
        row.expand();
        row.scrollIntoView();
        row.focus();
      });
    }
  }

  private _addActionDialog() {
    showAddAutomationElementDialog(this, {
      type: "action",
      add: this._addAction,
      clipboardItem: getType(this._clipboard?.action),
    });
  }

  private _addActionBuildingBlockDialog() {
    showAddAutomationElementDialog(this, {
      type: "action",
      add: this._addAction,
      clipboardItem: getType(this._clipboard?.action),
      group: "building_blocks",
    });
  }

  private _addAction = (action: string) => {
    let actions: Action[];
    if (action === PASTE_VALUE) {
      actions = this.actions.concat(deepClone(this._clipboard!.action));
    } else if (isService(action)) {
      actions = this.actions.concat({
        service: getService(action),
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
    const actions = nestedArrayMove(
      this.actions,
      oldIndex,
      newIndex,
      oldPath,
      newPath
    );

    fireEvent(this, "value-changed", { value: actions });
  }

  private _actionMoved(ev: CustomEvent): void {
    if (this.nested) return;
    ev.stopPropagation();
    const { oldIndex, newIndex, oldPath, newPath } = ev.detail;
    this._move(oldIndex, newIndex, oldPath, newPath);
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

  static get styles(): CSSResultGroup {
    return css`
      ha-automation-action-row {
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
    "ha-automation-action": HaAutomationAction;
  }
}
