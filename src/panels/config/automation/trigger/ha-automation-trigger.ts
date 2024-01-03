import "@material/mwc-button";
import { mdiArrowDown, mdiArrowUp, mdiDrag, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import { CSSResultGroup, LitElement, PropertyValues, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import type { SortableEvent } from "sortablejs";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-svg-icon";
import { AutomationClipboard, Trigger } from "../../../../data/automation";
import { sortableStyles } from "../../../../resources/ha-sortable-style";
import type { SortableInstance } from "../../../../resources/sortable";
import { HomeAssistant } from "../../../../types";
import "./ha-automation-trigger-row";
import type HaAutomationTriggerRow from "./ha-automation-trigger-row";
import {
  PASTE_VALUE,
  showAddAutomationElementDialog,
} from "../show-add-automation-element-dialog";

@customElement("ha-automation-trigger")
export default class HaAutomationTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public triggers!: Trigger[];

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

  private _focusLastTriggerOnChange = false;

  private _triggerKeys = new WeakMap<Trigger, string>();

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
                "ui.panel.config.automation.editor.re_order_mode.description_triggers"
              )}
              <mwc-button slot="action" @click=${this._exitReOrderMode}>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.re_order_mode.exit"
                )}
              </mwc-button>
            </ha-alert>
          `
        : null}
      <div class="triggers">
        ${repeat(
          this.triggers,
          (trigger) => this._getKey(trigger),
          (trg, idx) => html`
            <ha-automation-trigger-row
              .index=${idx}
              .trigger=${trg}
              .hideMenu=${this.reOrderMode}
              @duplicate=${this._duplicateTrigger}
              @value-changed=${this._triggerChanged}
              .hass=${this.hass}
              .disabled=${this.disabled}
              @re-order=${this._enterReOrderMode}
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
                      .disabled=${idx === this.triggers.length - 1}
                    ></ha-icon-button>
                    <div class="handle" slot="icons">
                      <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                    </div>
                  `
                : ""}
            </ha-automation-trigger-row>
          `
        )}
        <ha-button
          outlined
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.add"
          )}
          .disabled=${this.disabled}
          @click=${this._addTriggerDialog}
        >
          <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
        </ha-button>
      </div>
    `;
  }

  private _addTriggerDialog() {
    showAddAutomationElementDialog(this, {
      type: "trigger",
      add: this._addTrigger,
      clipboardItem: this._clipboard?.trigger?.platform,
    });
  }

  private _addTrigger = (value: string) => {
    let triggers: Trigger[];
    if (value === PASTE_VALUE) {
      triggers = this.triggers.concat(deepClone(this._clipboard!.trigger));
    } else {
      const platform = value as Trigger["platform"];
      const elClass = customElements.get(
        `ha-automation-trigger-${platform}`
      ) as CustomElementConstructor & {
        defaultConfig: Omit<Trigger, "platform">;
      };
      triggers = this.triggers.concat({
        platform: platform as any,
        ...elClass.defaultConfig,
      });
    }
    this._focusLastTriggerOnChange = true;
    fireEvent(this, "value-changed", { value: triggers });
  };

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("reOrderMode")) {
      if (this.reOrderMode) {
        this._createSortable();
      } else {
        this._destroySortable();
      }
    }

    if (changedProps.has("triggers") && this._focusLastTriggerOnChange) {
      this._focusLastTriggerOnChange = false;

      const row = this.shadowRoot!.querySelector<HaAutomationTriggerRow>(
        "ha-automation-trigger-row:last-of-type"
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
    this._sortable = new Sortable(
      this.shadowRoot!.querySelector(".triggers")!,
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

  private _getKey(action: Trigger) {
    if (!this._triggerKeys.has(action)) {
      this._triggerKeys.set(action, Math.random().toString());
    }

    return this._triggerKeys.get(action)!;
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
    const triggers = this.triggers.concat();
    const trigger = triggers.splice(index, 1)[0];
    triggers.splice(newIndex, 0, trigger);
    fireEvent(this, "value-changed", { value: triggers });
  }

  private _triggerChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const triggers = [...this.triggers];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      triggers.splice(index, 1);
    } else {
      // Store key on new value.
      const key = this._getKey(triggers[index]);
      this._triggerKeys.set(newValue, key);

      triggers[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: triggers });
  }

  private _duplicateTrigger(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    fireEvent(this, "value-changed", {
      value: this.triggers.concat(deepClone(this.triggers[index])),
    });
  }

  static get styles(): CSSResultGroup {
    return [
      sortableStyles,
      css`
        ha-automation-trigger-row {
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
          border-radius: var(--ha-card-border-radius, 16px);
          overflow: hidden;
        }
        .handle {
          cursor: move; /* fallback if grab cursor is unsupported */
          cursor: grab;
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
    "ha-automation-trigger": HaAutomationTrigger;
  }
}
