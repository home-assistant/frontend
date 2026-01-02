import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import { stringCompare } from "../../../../../common/string/compare";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import { CONDITION_ICONS } from "../../../../../components/ha-condition-icon";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-select";
import type { HaSelect } from "../../../../../components/ha-select";
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
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../../types";
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

    return html`
      ${this.inSidebar || (!this.inSidebar && !this.indent)
        ? html`
            <ha-select
              fixedMenuPosition
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.conditions.type_select"
              )}
              .disabled=${this.disabled}
              .value=${this.action.condition in this._conditionDescriptions
                ? `${DYNAMIC_PREFIX}${this.action.condition}`
                : this.action.condition}
              naturalMenuWidth
              @selected=${this._typeChanged}
              @closed=${stopPropagation}
            >
              ${this._processedTypes(
                this._conditionDescriptions,
                this.hass.localize
              ).map(
                ([opt, label, condition]) => html`
                  <ha-list-item .value=${opt} graphic="icon">
                    ${label}
                    <ha-condition-icon
                      .hass=${this.hass}
                      slot="graphic"
                      .condition=${condition}
                    ></ha-condition-icon>
                  </ha-list-item>
                `
              )}
            </ha-select>
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

  private _processedTypes = memoizeOne(
    (
      conditionDescriptions: ConditionDescriptions,
      localize: LocalizeFunc
    ): [string, string, string][] => {
      const legacy = (
        Object.keys(CONDITION_ICONS) as (keyof typeof CONDITION_ICONS)[]
      ).map(
        (condition) =>
          [
            condition,
            localize(
              `ui.panel.config.automation.editor.conditions.type.${condition}.label`
            ),
            condition,
          ] as [string, string, string]
      );
      const platform = Object.keys(conditionDescriptions).map((condition) => {
        const domain = getConditionDomain(condition);
        const conditionObjId = getConditionObjectId(condition);
        return [
          `${DYNAMIC_PREFIX}${condition}`,
          localize(`component.${domain}.conditions.${conditionObjId}.name`) ||
            condition,
          condition,
        ] as [string, string, string];
      });
      return [...legacy, ...platform].sort((a, b) =>
        stringCompare(a[1], b[1], this.hass.locale.language)
      );
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

  private _typeChanged(ev: CustomEvent) {
    const type = (ev.target as HaSelect).value;

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
    ha-select {
      margin-bottom: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-condition": HaConditionAction;
  }
}
