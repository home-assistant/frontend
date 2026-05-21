import { mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import type {
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { ensureArray } from "../../../../common/array/ensure-array";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import {
  getValueFromDynamic,
  isDynamic,
  type Trigger,
  type TriggerList,
} from "../../../../data/automation";
import { subscribeLabFeature } from "../../../../data/labs";
import type { TriggerDescriptions } from "../../../../data/trigger";
import {
  getNextNumericTriggerId,
  getUniqueTriggerId,
  isTriggerList,
  subscribeTriggers,
} from "../../../../data/trigger";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { EDITOR_SAVE_FAB_TOAST_BOTTOM_OFFSET } from "../editor-toast";
import { AutomationSortableListMixin } from "../ha-automation-sortable-list-mixin";
import {
  getAddAutomationElementTargetFromQuery,
  PASTE_VALUE,
  showAddAutomationElementDialog,
} from "../show-add-automation-element-dialog";
import { automationRowsStyles } from "../styles";
import "./ha-automation-trigger-row";
import type HaAutomationTriggerRow from "./ha-automation-trigger-row";

@customElement("ha-automation-trigger")
export default class HaAutomationTrigger extends AutomationSortableListMixin<Trigger>(
  SubscribeMixin(LitElement)
) {
  @property({ attribute: false }) public triggers!: Trigger[];

  @property({ attribute: false }) public highlightedTriggers?: Trigger[];

  @property({ type: Boolean }) public root = false;

  @property({ type: Boolean, attribute: false }) public editorDirty = false;

  @state() private _triggerDescriptions: TriggerDescriptions = {};

  // @ts-ignore
  @state() private _newTriggersAndConditions = false;

  private _unsub?: Promise<UnsubscribeFunc>;

  private _openedAddDialogFromQuery = false;

  protected get items(): Trigger[] {
    return this.triggers;
  }

  protected set items(items: Trigger[]) {
    this.triggers = items;
  }

  protected setHighlightedItems(items: Trigger[]) {
    this.highlightedTriggers = items;
  }

  protected override pasteItem(ev: CustomEvent) {
    if (this.root && ev.detail.item) {
      const pasted = deepClone(ev.detail.item) as Trigger;
      if (!isTriggerList(pasted)) {
        pasted.id = pasted.id
          ? getUniqueTriggerId(pasted.id, this.triggers)
          : getNextNumericTriggerId(this.triggers);
      }
      ev.detail.item = pasted;
    }
    super.pasteItem(ev);
  }

  protected override insertAfter(ev: CustomEvent) {
    // Only dedupe when a single trigger is being inserted.
    const incoming = ensureArray(ev.detail.value) as Trigger[];
    if (this.root && incoming.length === 1) {
      const trigger = deepClone(incoming[0]);
      if (!isTriggerList(trigger)) {
        trigger.id = trigger.id
          ? getUniqueTriggerId(trigger.id, this.triggers)
          : getNextNumericTriggerId(this.triggers);
      }
      ev.detail.value = trigger;
    }
    super.insertAfter(ev);
  }

  protected override duplicateItem(ev: CustomEvent) {
    if (this.root) {
      const index = (ev.target as any).index;
      const duplicated = deepClone(this.triggers[index]);
      if (!isTriggerList(duplicated)) {
        duplicated.id = duplicated.id
          ? getUniqueTriggerId(duplicated.id, this.triggers)
          : getNextNumericTriggerId(this.triggers);
      }
      fireEvent(this, "value-changed", {
        // @ts-expect-error Requires library bump to ES2023
        value: this.triggers.toSpliced(index + 1, 0, duplicated),
      });
      ev.stopPropagation();
      return;
    }
    super.duplicateItem(ev);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  protected hassSubscribe() {
    return [
      subscribeLabFeature(
        this.hass!.connection,
        "automation",
        "new_triggers_conditions",
        (feature) => {
          this._newTriggersAndConditions = feature.enabled;
        }
      ),
    ];
  }

  private _subscribeDescriptions() {
    this._unsubscribe();
    this._triggerDescriptions = {};
    this._unsub = subscribeTriggers(this.hass, (descriptions) => {
      this._triggerDescriptions = {
        ...this._triggerDescriptions,
        ...descriptions,
      };
    });
  }

  private _unsubscribe() {
    if (this._unsub) {
      this._unsub.then((unsub) => unsub());
      this._unsub = undefined;
    }
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("_newTriggersAndConditions")) {
      this._subscribeDescriptions();
    }
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("triggers");
  }

  protected render() {
    return html`
      <ha-sortable
        handle-selector=".handle"
        draggable-selector="ha-automation-trigger-row"
        .disabled=${this.disabled}
        group="triggers"
        invert-swap
        @item-moved=${this.itemMoved}
        @item-added=${this.itemAdded}
        @item-removed=${this.itemRemoved}
      >
        <div class="rows ${!this.optionsInSidebar ? "no-sidebar" : ""}">
          ${repeat(
            this.triggers,
            (trigger) => this.getKey(trigger),
            (trg, idx) => html`
              <ha-automation-trigger-row
                .sortableData=${trg}
                .index=${idx}
                .first=${idx === 0}
                .last=${idx === this.triggers.length - 1}
                .trigger=${trg}
                .triggerDescriptions=${this._triggerDescriptions}
                @duplicate=${this.duplicateItem}
                @paste=${this.pasteItem}
                @insert-after=${this.insertAfter}
                @move-down=${this.moveDown}
                @move-up=${this.moveUp}
                @value-changed=${this.itemChanged}
                .hass=${this.hass}
                .disabled=${this.disabled}
                .narrow=${this.narrow}
                .highlight=${this.highlightedTriggers?.includes(trg)}
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
    if (this.narrow) {
      fireEvent(this, "request-close-sidebar");
    }
    showAddAutomationElementDialog(this, {
      type: "trigger",
      add: this._addTrigger,
      clipboardItem: !this._clipboard?.trigger
        ? undefined
        : isTriggerList(this._clipboard.trigger)
          ? "list"
          : this._clipboard?.trigger?.trigger,
      clipboardPasteToastBottomOffset: this.editorDirty
        ? EDITOR_SAVE_FAB_TOAST_BOTTOM_OFFSET
        : undefined,
    });
  }

  private _addTrigger = (value: string, target?: HassServiceTarget) => {
    let triggers: Trigger[];
    if (value === PASTE_VALUE) {
      const pasted = deepClone(this._clipboard!.trigger!);
      if (this.root && !isTriggerList(pasted)) {
        pasted.id = pasted.id
          ? getUniqueTriggerId(pasted.id, this.triggers)
          : getNextNumericTriggerId(this.triggers);
      }
      triggers = this.triggers.concat(pasted);
    } else {
      let newTrigger: Trigger;
      if (isDynamic(value)) {
        newTrigger = {
          trigger: getValueFromDynamic(value),
          target,
        };
      } else {
        const trigger = value as Exclude<Trigger, TriggerList>["trigger"];
        const elClass = customElements.get(
          `ha-automation-trigger-${trigger}`
        ) as CustomElementConstructor & {
          defaultConfig: Trigger;
        };
        newTrigger = {
          ...elClass.defaultConfig,
          ...(target?.entity_id ? { entity_id: target.entity_id } : {}),
        };
      }
      if (this.root && !isTriggerList(newTrigger)) {
        newTrigger.id = getNextNumericTriggerId(this.triggers);
      }
      triggers = this.triggers.concat(newTrigger);
    }
    this.focusLastItemOnChange = true;
    fireEvent(this, "value-changed", { value: triggers });
  };

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);

    if (!this.hass) {
      return;
    }

    const addTriggerTargetFromQuery = getAddAutomationElementTargetFromQuery(
      this.hass.states,
      this.hass.devices,
      "trigger"
    );

    if (changedProps.has("triggers") && addTriggerTargetFromQuery) {
      this._openedAddDialogFromQuery = false;
    }

    if (
      !this._openedAddDialogFromQuery &&
      this.root &&
      !this.disabled &&
      this.triggers.length === 0 &&
      addTriggerTargetFromQuery
    ) {
      this._openedAddDialogFromQuery = true;
      queueMicrotask(() => this._addTriggerDialog());
    } else if (this._openedAddDialogFromQuery && !addTriggerTargetFromQuery) {
      this._openedAddDialogFromQuery = false;
    }

    if (
      changedProps.has("triggers") &&
      (this.focusLastItemOnChange || this.focusItemIndexOnChange !== undefined)
    ) {
      const row = this.shadowRoot!.querySelector<HaAutomationTriggerRow>(
        `ha-automation-trigger-row:${this.focusLastItemOnChange ? "last-of-type" : `nth-of-type(${this.focusItemIndexOnChange! + 1})`}`
      )!;

      this.focusLastItemOnChange = false;
      this.focusItemIndexOnChange = undefined;

      row.updateComplete.then(() => {
        if (this.optionsInSidebar) {
          row.openSidebar();
          if (this.narrow) {
            row.scrollIntoView({
              block: "start",
              behavior: "smooth",
            });
          }
        } else {
          row.expand();
          row.focus();
        }
        row.markAsNew();
      });
    }
  }

  public expandAll() {
    const triggerRows =
      this.shadowRoot!.querySelectorAll<HaAutomationTriggerRow>(
        "ha-automation-trigger-row"
      )!;
    triggerRows.forEach((row) => {
      row.expand();
    });
  }

  static styles = automationRowsStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger": HaAutomationTrigger;
  }
}
