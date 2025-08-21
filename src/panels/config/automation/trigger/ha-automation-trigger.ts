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
import "../../../../components/ha-button-menu";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import type {
  AutomationClipboard,
  Trigger,
  TriggerList,
} from "../../../../data/automation";
import { isTriggerList } from "../../../../data/trigger";
import type { HomeAssistant } from "../../../../types";
import {
  PASTE_VALUE,
  showAddAutomationElementDialog,
} from "../show-add-automation-element-dialog";
import "./ha-automation-trigger-row";
import type HaAutomationTriggerRow from "./ha-automation-trigger-row";

@customElement("ha-automation-trigger")
export default class HaAutomationTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public triggers!: Trigger[];

  @property({ attribute: false }) public highlightedTriggers?: Trigger[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: "sidebar" }) public optionsInSidebar =
    false;

  @property({ type: Boolean }) public root = false;

  @state() private _showReorder = false;

  @state()
  @storage({
    key: "automationClipboard",
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: AutomationClipboard;

  private _focusLastTriggerOnChange = false;

  private _triggerKeys = new WeakMap<Trigger, string>();

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
        draggable-selector="ha-automation-trigger-row"
        .disabled=${!this._showReorder || this.disabled}
        group="triggers"
        invert-swap
        @item-moved=${this._triggerMoved}
        @item-added=${this._triggerAdded}
        @item-removed=${this._triggerRemoved}
      >
        <div class="triggers">
          ${repeat(
            this.triggers,
            (trigger) => this._getKey(trigger),
            (trg, idx) => html`
              <ha-automation-trigger-row
                .sortableData=${trg}
                .index=${idx}
                .first=${idx === 0}
                .last=${idx === this.triggers.length - 1}
                .trigger=${trg}
                @duplicate=${this._duplicateTrigger}
                @move-down=${this._moveDown}
                @move-up=${this._moveUp}
                @value-changed=${this._triggerChanged}
                .hass=${this.hass}
                .disabled=${this.disabled}
                .narrow=${this.narrow}
                ?highlight=${this.highlightedTriggers?.includes(trg)}
                .optionsInSidebar=${this.optionsInSidebar}
              >
                ${this._showReorder && !this.disabled
                  ? html`
                      <div class="handle" slot="icons">
                        <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                      </div>
                    `
                  : nothing}
              </ha-automation-trigger-row>
            `
          )}
          <div class="buttons">
            <ha-button
              .disabled=${this.disabled}
              @click=${this._addTriggerDialog}
              .appearance=${this.root ? "accent" : "filled"}
              .size=${this.root ? "medium" : "small"}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.triggers.add"
              )}
              <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
            </ha-button>
          </div>
        </div>
      </ha-sortable>
    `;
  }

  private _addTriggerDialog() {
    showAddAutomationElementDialog(this, {
      type: "trigger",
      add: this._addTrigger,
      clipboardItem: !this._clipboard?.trigger
        ? undefined
        : isTriggerList(this._clipboard.trigger)
          ? "list"
          : this._clipboard?.trigger?.trigger,
    });
  }

  private _addTrigger = (value: string) => {
    let triggers: Trigger[];
    if (value === PASTE_VALUE) {
      triggers = this.triggers.concat(deepClone(this._clipboard!.trigger));
    } else {
      const trigger = value as Exclude<Trigger, TriggerList>["trigger"];
      const elClass = customElements.get(
        `ha-automation-trigger-${trigger}`
      ) as CustomElementConstructor & {
        defaultConfig: Trigger;
      };
      triggers = this.triggers.concat({
        ...elClass.defaultConfig,
      });
    }
    this._focusLastTriggerOnChange = true;
    fireEvent(this, "value-changed", { value: triggers });
  };

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("triggers") && this._focusLastTriggerOnChange) {
      this._focusLastTriggerOnChange = false;

      const row = this.shadowRoot!.querySelector<HaAutomationTriggerRow>(
        "ha-automation-trigger-row:last-of-type"
      )!;
      row.updateComplete.then(() => {
        if (this.optionsInSidebar) {
          row.openSidebar();
        } else {
          row.expand();
        }
        row.focus();
      });
    }
  }

  public expandAll() {
    const rows = this.shadowRoot!.querySelectorAll<HaAutomationTriggerRow>(
      "ha-automation-trigger-row"
    )!;
    rows.forEach((row) => {
      row.expand();
    });
  }

  private _getKey(action: Trigger) {
    if (!this._triggerKeys.has(action)) {
      this._triggerKeys.set(action, Math.random().toString());
    }

    return this._triggerKeys.get(action)!;
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
    const triggers = this.triggers.concat();
    const item = triggers.splice(oldIndex, 1)[0];
    triggers.splice(newIndex, 0, item);
    this.triggers = triggers;
    fireEvent(this, "value-changed", { value: triggers });
  }

  private _triggerMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    this._move(oldIndex, newIndex);
  }

  private async _triggerAdded(ev: CustomEvent): Promise<void> {
    ev.stopPropagation();
    const { index, data } = ev.detail;
    let triggers = [
      ...this.triggers.slice(0, index),
      data,
      ...this.triggers.slice(index),
    ];
    // Add trigger locally to avoid UI jump
    this.triggers = triggers;
    await nextRender();
    if (this.triggers !== triggers) {
      // Ensure trigger is added even after update
      triggers = [
        ...this.triggers.slice(0, index),
        data,
        ...this.triggers.slice(index),
      ];
    }
    fireEvent(this, "value-changed", { value: triggers });
  }

  private async _triggerRemoved(ev: CustomEvent): Promise<void> {
    ev.stopPropagation();
    const { index } = ev.detail;
    const trigger = this.triggers[index];
    // Remove trigger locally to avoid UI jump
    this.triggers = this.triggers.filter((t) => t !== trigger);
    await nextRender();
    // Ensure trigger is removed even after update
    const triggers = this.triggers.filter((t) => t !== trigger);
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

  static styles = css`
    .triggers {
      padding: 16px 0 16px 16px;
      margin: -16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    :host([root]) .triggers {
      padding-right: 8px;
    }
    .sortable-ghost {
      background: none;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
    }
    .sortable-drag {
      background: none;
    }
    ha-automation-trigger-row {
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
    "ha-automation-trigger": HaAutomationTrigger;
  }
}
