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
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import type { SortableEvent } from "sortablejs";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stringCompare } from "../../../../common/string/compare";
import { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-button";
import "../../../../components/ha-button-menu";
import type { HaSelect } from "../../../../components/ha-select";
import "../../../../components/ha-svg-icon";
import { ACTION_TYPES } from "../../../../data/action";
import { AutomationClipboard } from "../../../../data/automation";
import { Action } from "../../../../data/script";
import { sortableStyles } from "../../../../resources/ha-sortable-style";
import type { SortableInstance } from "../../../../resources/sortable";
import { Entries, HomeAssistant } from "../../../../types";
import type HaAutomationActionRow from "./ha-automation-action-row";
import { getType } from "./ha-automation-action-row";
import "./types/ha-automation-action-activate_scene";
import "./types/ha-automation-action-choose";
import "./types/ha-automation-action-condition";
import "./types/ha-automation-action-delay";
import "./types/ha-automation-action-device_id";
import "./types/ha-automation-action-event";
import "./types/ha-automation-action-if";
import "./types/ha-automation-action-parallel";
import "./types/ha-automation-action-play_media";
import "./types/ha-automation-action-repeat";
import "./types/ha-automation-action-service";
import "./types/ha-automation-action-stop";
import "./types/ha-automation-action-wait_for_trigger";
import "./types/ha-automation-action-wait_template";

const PASTE_VALUE = "__paste__";

@customElement("ha-automation-action")
export default class HaAutomationAction extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public nested = false;

  @property() public actions!: Action[];

  @property({ type: Boolean }) public reOrderMode = false;

  @storage({
    key: "automationClipboard",
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: AutomationClipboard;

  private _focusLastActionOnChange = false;

  private _actionKeys = new WeakMap<Action, string>();

  private _sortable?: SortableInstance;

  protected render() {
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
                "ui.panel.config.automation.editor.re_order_mode.description_actions"
              )}
              <mwc-button slot="action" @click=${this._exitReOrderMode}>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.re_order_mode.exit"
                )}
              </mwc-button>
            </ha-alert>
          `
        : null}
      <div class="actions">
        ${repeat(
          this.actions,
          (action) => this._getKey(action),
          (action, idx) => html`
            <ha-automation-action-row
              .index=${idx}
              .action=${action}
              .narrow=${this.narrow}
              .disabled=${this.disabled}
              .hideMenu=${this.reOrderMode}
              .reOrderMode=${this.reOrderMode}
              @duplicate=${this._duplicateAction}
              @value-changed=${this._actionChanged}
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
      <ha-button-menu
        @action=${this._addAction}
        .disabled=${this.disabled}
        fixed
      >
        <ha-button
          slot="trigger"
          outlined
          .disabled=${this.disabled}
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.actions.add"
          )}
        >
          <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
        </ha-button>
        ${this._clipboard?.action
          ? html` <mwc-list-item .value=${PASTE_VALUE} graphic="icon">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.paste"
              )}
              (${this.hass.localize(
                `ui.panel.config.automation.editor.actions.type.${
                  getType(this._clipboard.action) || "unknown"
                }.label`
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

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("reOrderMode")) {
      if (this.reOrderMode) {
        this._createSortable();
      } else {
        this._destroySortable();
      }
    }
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
    this._sortable = new Sortable(this.shadowRoot!.querySelector(".actions")!, {
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
    });
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private _getKey(action: Action) {
    if (!this._actionKeys.has(action)) {
      this._actionKeys.set(action, Math.random().toString());
    }

    return this._actionKeys.get(action)!;
  }

  private _addAction(ev: CustomEvent<ActionDetail>) {
    const action = (ev.currentTarget as HaSelect).items[ev.detail.index].value;

    let actions: Action[];
    if (action === PASTE_VALUE) {
      actions = this.actions.concat(deepClone(this._clipboard!.action));
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
    const actions = this.actions.concat();
    const action = actions.splice(index, 1)[0];
    actions.splice(newIndex, 0, action);
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
      value: this.actions.concat(deepClone(this.actions[index])),
    });
  }

  private _processedTypes = memoizeOne(
    (localize: LocalizeFunc): [string, string, string][] =>
      (Object.entries(ACTION_TYPES) as Entries<typeof ACTION_TYPES>)
        .map(
          ([action, icon]) =>
            [
              action,
              localize(
                `ui.panel.config.automation.editor.actions.type.${action}.label`
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
    "ha-automation-action": HaAutomationAction;
  }
}
