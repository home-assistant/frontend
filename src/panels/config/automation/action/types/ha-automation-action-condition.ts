import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { stringCompare } from "../../../../../common/string/compare";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-select";
import type { HaSelect } from "../../../../../components/ha-select";
import type { Condition } from "../../../../../data/automation";
import {
  CONDITION_BUILDING_BLOCKS,
  CONDITION_ICONS,
} from "../../../../../data/condition";
import type { Entries, HomeAssistant } from "../../../../../types";
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
export class HaConditionAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public action!: Condition;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: "sidebar" }) public inSidebar = false;

  @property({ type: Boolean, attribute: "indent" }) public indent = false;

  @query("ha-automation-condition-editor")
  private _conditionEditor?: HaAutomationConditionEditor;

  public static get defaultConfig(): Omit<Condition, "state" | "entity_id"> {
    return { condition: "state" };
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
              .value=${this.action.condition}
              naturalMenuWidth
              @selected=${this._typeChanged}
            >
              ${this._processedTypes(this.hass.localize).map(
                ([opt, label, icon]) => html`
                  <ha-list-item .value=${opt} graphic="icon">
                    ${label}<ha-svg-icon
                      slot="graphic"
                      .path=${icon}
                    ></ha-svg-icon
                  ></ha-list-item>
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
              .disabled=${this.disabled}
              .hass=${this.hass}
              @value-changed=${this._conditionChanged}
              .narrow=${this.narrow}
              .uiSupported=${this._uiSupported(this.action.condition)}
              .indent=${this.indent}
              action
            ></ha-automation-condition-editor>
          `
        : nothing}
    `;
  }

  private _processedTypes = memoizeOne(
    (localize: LocalizeFunc): [string, string, string][] =>
      (Object.entries(CONDITION_ICONS) as Entries<typeof CONDITION_ICONS>)
        .map(
          ([condition, icon]) =>
            [
              condition,
              localize(
                `ui.panel.config.automation.editor.conditions.type.${condition}.label`
              ),
              icon,
            ] as [string, string, string]
        )
        .sort((a, b) => stringCompare(a[1], b[1], this.hass.locale.language))
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
