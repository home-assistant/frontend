import { mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import type {
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, queryAll, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import {
  getValueFromDynamic,
  isDynamic,
  type Condition,
} from "../../../../data/automation";
import type { ConditionDescriptions } from "../../../../data/condition";
import {
  CONDITION_BUILDING_BLOCKS,
  subscribeConditions,
} from "../../../../data/condition";
import { subscribeLabFeature } from "../../../../data/labs";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import {
  PASTE_VALUE,
  showAddAutomationElementDialog,
} from "../show-add-automation-element-dialog";
import { AutomationSortableListMixin } from "../ha-automation-sortable-list-mixin";
import { automationRowsStyles } from "../styles";
import "./ha-automation-condition-row";
import type HaAutomationConditionRow from "./ha-automation-condition-row";

@customElement("ha-automation-condition")
export default class HaAutomationCondition extends AutomationSortableListMixin<Condition>(
  SubscribeMixin(LitElement)
) {
  @property({ attribute: false }) public conditions!: Condition[];

  @property({ attribute: false }) public highlightedConditions?: Condition[];

  @property({ type: Boolean }) public root = false;

  @state() private _conditionDescriptions: ConditionDescriptions = {};

  @queryAll("ha-automation-condition-row")
  private _conditionRowElements?: HaAutomationConditionRow[];

  // @ts-ignore
  @state() private _newTriggersAndConditions = false;

  private _unsub?: Promise<UnsubscribeFunc>;

  protected get items(): Condition[] {
    return this.conditions;
  }

  protected set items(items: Condition[]) {
    this.conditions = items;
  }

  protected setHighlightedItems(items: Condition[]) {
    this.highlightedConditions = items;
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
    this._conditionDescriptions = {};
    this._unsub = subscribeConditions(this.hass, (descriptions) => {
      this._conditionDescriptions = {
        ...this._conditionDescriptions,
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

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("conditions");
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
    } else if (
      this.focusLastItemOnChange ||
      this.focusItemIndexOnChange !== undefined
    ) {
      const mode = this.focusLastItemOnChange ? "new" : "moved";

      const row = this.shadowRoot!.querySelector<HaAutomationConditionRow>(
        `ha-automation-condition-row:${mode === "new" ? "last-of-type" : `nth-of-type(${this.focusItemIndexOnChange! + 1})`}`
      )!;

      this.focusLastItemOnChange = false;
      this.focusItemIndexOnChange = undefined;

      row.updateComplete.then(() => {
        // on new condition open the settings in the sidebar, except for building blocks
        if (
          this.optionsInSidebar &&
          (!CONDITION_BUILDING_BLOCKS.includes(row.condition.condition) ||
            mode === "moved")
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
    this._conditionRowElements?.forEach((row) => {
      row.expandAll();
    });
  }

  public collapseAll() {
    this._conditionRowElements?.forEach((row) => {
      row.collapseAll();
    });
  }

  protected render() {
    if (!Array.isArray(this.conditions)) {
      return nothing;
    }
    return html`
      <ha-sortable
        handle-selector=".handle"
        draggable-selector="ha-automation-condition-row"
        .disabled=${this.disabled}
        group="conditions"
        invert-swap
        @item-moved=${this.itemMoved}
        @item-added=${this.itemAdded}
        @item-removed=${this.itemRemoved}
      >
        <div class="rows ${!this.optionsInSidebar ? "no-sidebar" : ""}">
          ${repeat(
            this.conditions.filter((c) => typeof c === "object"),
            (condition) => this.getKey(condition),
            (cond, idx) => html`
              <ha-automation-condition-row
                .root=${this.root}
                .sortableData=${cond}
                .index=${idx}
                .first=${idx === 0}
                .last=${idx === this.conditions.length - 1}
                .totalConditions=${this.conditions.length}
                .condition=${cond}
                .conditionDescriptions=${this._conditionDescriptions}
                .disabled=${this.disabled}
                .narrow=${this.narrow}
                @duplicate=${this.duplicateItem}
                @insert-after=${this.insertAfter}
                @move-down=${this.moveDown}
                @move-up=${this.moveUp}
                @value-changed=${this.itemChanged}
                .hass=${this.hass}
                .highlight=${this.highlightedConditions?.includes(cond)}
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
              </ha-automation-condition-row>
            `
          )}
          <div class="buttons">
            <ha-button
              .disabled=${this.disabled}
              @click=${this._addConditionDialog}
              .appearance=${this.root ? "accent" : "filled"}
              .size=${this.root ? "medium" : "small"}
            >
              <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.conditions.add"
              )}
            </ha-button>
          </div>
        </div>
      </ha-sortable>
    `;
  }

  private _addConditionDialog() {
    if (this.narrow) {
      fireEvent(this, "request-close-sidebar");
    }
    showAddAutomationElementDialog(this, {
      type: "condition",
      add: this._addCondition,
      clipboardItem: this._clipboard?.condition?.condition,
    });
  }

  private _addCondition = (value: string, target?: HassServiceTarget) => {
    let conditions: Condition[];
    if (value === PASTE_VALUE) {
      conditions = this.conditions.concat(
        deepClone(this._clipboard!.condition)
      );
    } else if (isDynamic(value)) {
      conditions = this.conditions.concat({
        condition: getValueFromDynamic(value),
        target,
      });
    } else {
      const condition = value as Condition["condition"];
      const elClass = customElements.get(
        `ha-automation-condition-${condition}`
      ) as CustomElementConstructor & {
        defaultConfig: Condition;
      };
      conditions = this.conditions.concat({
        ...elClass.defaultConfig,
      });
    }
    this.focusLastItemOnChange = true;
    fireEvent(this, "value-changed", { value: conditions });
  };

  static styles = automationRowsStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition": HaAutomationCondition;
  }
}
