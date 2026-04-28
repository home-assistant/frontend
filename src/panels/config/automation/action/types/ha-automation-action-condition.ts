import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../../../common/translations/localize";
import { CONDITION_ICONS } from "../../../../../components/ha-condition-icon";
import "../../../../../components/ha-dropdown-item";
import type { PickerComboBoxItem } from "../../../../../components/ha-picker-combo-box";
import "../../../../../components/ha-select";
import {
  DYNAMIC_PREFIX,
  getValueFromDynamic,
  isDynamic,
  type Condition,
} from "../../../../../data/automation";
import type { ConditionDescriptions } from "../../../../../data/condition";
import {
  CONDITION_BUILDING_BLOCKS,
  getConditionDomain,
  getConditionObjectId,
  subscribeConditions,
} from "../../../../../data/condition";
import { domainToName } from "../../../../../data/integration";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import type { HomeAssistant, ValueChangedEvent } from "../../../../../types";
import "../../condition/ha-automation-condition-editor";
import type HaAutomationConditionEditor from "../../condition/ha-automation-condition-editor";
import "../../condition/types/ha-automation-condition-and";
import "../../condition/types/ha-automation-condition-device";
import "../../condition/types/ha-automation-condition-not";
import "../../condition/types/ha-automation-condition-numeric_state";
import "../../condition/types/ha-automation-condition-or";
import "../../condition/types/ha-automation-condition-state";
import "../../condition/types/ha-automation-condition-sun";
import "../../condition/types/ha-automation-condition-template";
import "../../condition/types/ha-automation-condition-time";
import "../../condition/types/ha-automation-condition-trigger";
import "../../condition/types/ha-automation-condition-zone";
import type { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-condition")
export class HaConditionAction
  extends SubscribeMixin(LitElement)
  implements ActionElement
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public action!: Condition;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: "sidebar" }) public inSidebar = false;

  @property({ type: Boolean, attribute: "indent" }) public indent = false;

  @state() private _conditionDescriptions: ConditionDescriptions = {};

  @query("ha-automation-condition-editor")
  private _conditionEditor?: HaAutomationConditionEditor;

  public static get defaultConfig(): Omit<Condition, "state" | "entity_id"> {
    return { condition: "state" };
  }

  protected hassSubscribe() {
    return [
      subscribeConditions(this.hass, (conditions) =>
        this._addConditions(conditions)
      ),
    ];
  }

  private _addConditions(conditions: ConditionDescriptions) {
    this._conditionDescriptions = {
      ...this._conditionDescriptions,
      ...conditions,
    };
  }

  protected render() {
    const buildingBlock = CONDITION_BUILDING_BLOCKS.includes(
      this.action.condition
    );

    const value =
      this.action.condition in this._conditionDescriptions
        ? `${DYNAMIC_PREFIX}${this.action.condition}`
        : this.action.condition;

    return html`
      ${this.inSidebar || (!this.inSidebar && !this.indent)
        ? html`
            <ha-generic-picker
              .hass=${this.hass}
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.conditions.type_select"
              )}
              .disabled=${this.disabled}
              .value=${value}
              .getItems=${this._processedTypes(
                this._conditionDescriptions,
                this.hass.localize
              )}
              .rowRenderer=${this._rowRenderer}
              .valueRenderer=${this._valueRenderer}
              @value-changed=${this._typeChanged}
            ></ha-generic-picker>
          `
        : nothing}
      ${(this.indent && buildingBlock) ||
      (this.inSidebar && !buildingBlock) ||
      (!this.indent && !this.inSidebar)
        ? html`
            <ha-automation-condition-editor
              .condition=${this.action}
              .description=${this._conditionDescriptions[this.action.condition]}
              .disabled=${this.disabled}
              .hass=${this.hass}
              @value-changed=${this._conditionChanged}
              .narrow=${this.narrow}
              .uiSupported=${this._uiSupported(
                this._getType(this.action, this._conditionDescriptions)
              )}
              .indent=${this.indent}
              action
            ></ha-automation-condition-editor>
          `
        : nothing}
    `;
  }

  private _valueRenderer = (value: string) => {
    const isDynamicValue = isDynamic(value);
    const condition = isDynamicValue ? getValueFromDynamic(value) : value;

    let label: string;

    if (isDynamicValue) {
      const domain = getConditionDomain(condition);
      const conditionObjId = getConditionObjectId(condition);
      label =
        this.hass.localize(
          `component.${domain}.conditions.${conditionObjId}.name`
        ) || condition;
    } else {
      label =
        this.hass.localize(
          `ui.panel.config.automation.editor.conditions.type.${condition}.label` as LocalizeKeys
        ) || condition;
    }

    return html`<ha-condition-icon
        slot="start"
        .hass=${this.hass}
        .condition=${condition}
      ></ha-condition-icon
      ><span slot="headline">${label}</span>`;
  };

  private _rowRenderer = (item: PickerComboBoxItem) => html`
    <ha-combo-box-item type="button">
      <ha-condition-icon
        slot="start"
        .hass=${this.hass}
        .condition=${item.search_labels!.condition || undefined}
      ></ha-condition-icon>
      <span slot="headline">${item.primary}</span>
      ${item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing}
    </ha-combo-box-item>
  `;

  private _processedTypes = memoizeOne(
    (conditionDescriptions: ConditionDescriptions, localize: LocalizeFunc) => {
      const legacy = (
        Object.keys(CONDITION_ICONS) as (keyof typeof CONDITION_ICONS)[]
      ).map((condition) => {
        const primary = localize(
          `ui.panel.config.automation.editor.conditions.type.${condition}.label`
        );
        return {
          id: condition,
          primary,
          sorting_label: primary,
          search_labels: {
            condition,
          },
        };
      });
      const platform = Object.keys(conditionDescriptions).map((condition) => {
        const domain = getConditionDomain(condition);
        const conditionObjId = getConditionObjectId(condition);
        const primary =
          localize(`component.${domain}.conditions.${conditionObjId}.name`) ||
          condition;
        return {
          id: `${DYNAMIC_PREFIX}${condition}`,
          primary,
          secondary: domainToName(this.hass.localize, domain),
          sorting_label: primary,
          search_labels: {
            condition,
            domain,
          },
        };
      });
      return () => [...legacy, ...platform];
    }
  );

  private _getType = memoizeOne(
    (condition: Condition, conditionDescriptions: ConditionDescriptions) => {
      if (condition.condition in conditionDescriptions) {
        return "platform";
      }

      return condition.condition;
    }
  );

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();

    fireEvent(this, "value-changed", {
      value: ev.detail.value,
    });
  }

  private _typeChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const type = ev.detail.value;

    if (!type) {
      return;
    }

    if (isDynamic(type)) {
      const value = getValueFromDynamic(type);
      if (value !== this.action.condition) {
        fireEvent(this, "value-changed", {
          value: {
            condition: value,
          },
        });
      }
      return;
    }

    const elClass = customElements.get(
      `ha-automation-condition-${type}`
    ) as CustomElementConstructor & {
      defaultConfig: Condition;
    };

    if (type !== this.action.condition) {
      fireEvent(this, "value-changed", {
        value: {
          ...elClass.defaultConfig,
        },
      });
    }
  }

  private _uiSupported = memoizeOne(
    (type: string) =>
      customElements.get(`ha-automation-condition-${type}`) !== undefined
  );

  public expandAll() {
    this._conditionEditor?.expandAll();
  }

  public collapseAll() {
    this._conditionEditor?.collapseAll();
  }

  static styles = css`
    ha-generic-picker {
      margin-bottom: 24px;
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-condition": HaConditionAction;
  }
}
