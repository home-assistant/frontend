import { mdiPlus } from "@mdi/js";
import { repeat } from "lit/directives/repeat";
import deepClone from "deep-clone-simple";
import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { ActionDetail } from "@material/mwc-list";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-button-menu";
import type { Condition } from "../../../../data/automation";
import type { HomeAssistant } from "../../../../types";
import "./ha-automation-condition-row";
import type HaAutomationConditionRow from "./ha-automation-condition-row";
// Uncommenting these and this element doesn't load
// import "./types/ha-automation-condition-not";
// import "./types/ha-automation-condition-or";
import "./types/ha-automation-condition-and";
import "./types/ha-automation-condition-device";
import "./types/ha-automation-condition-numeric_state";
import "./types/ha-automation-condition-state";
import "./types/ha-automation-condition-sun";
import "./types/ha-automation-condition-template";
import "./types/ha-automation-condition-time";
import "./types/ha-automation-condition-trigger";
import "./types/ha-automation-condition-zone";
import { CONDITION_TYPES } from "../../../../data/condition";
import { stringCompare } from "../../../../common/string/compare";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { HaSelect } from "../../../../components/ha-select";

@customElement("ha-automation-condition")
export default class HaAutomationCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public conditions!: Condition[];

  private _focusLastConditionOnChange = false;

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
    } else if (this._focusLastConditionOnChange) {
      this._focusLastConditionOnChange = false;
      const row = this.shadowRoot!.querySelector<HaAutomationConditionRow>(
        "ha-automation-condition-row:last-of-type"
      )!;
      row.expand();
      row.focus();
    }
  }

  protected render() {
    if (!Array.isArray(this.conditions)) {
      return html``;
    }
    return html`
      ${repeat(
        this.conditions,
        // Use the condition as key, so moving around keeps the same DOM,
        // including expand state
        (condition) => condition,
        (cond, idx) => html`
          <ha-automation-condition-row
            .index=${idx}
            .condition=${cond}
            @duplicate=${this._duplicateCondition}
            @value-changed=${this._conditionChanged}
            .hass=${this.hass}
          ></ha-automation-condition-row>
        `
      )}
      <ha-button-menu fixed @action=${this._addCondition}>
        <mwc-button
          slot="trigger"
          outlined
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.add"
          )}
        >
          <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
        </mwc-button>
        ${this._processedTypes(this.hass.localize).map(
          ([opt, label]) => html`
            <mwc-list-item .value=${opt}>${label}</mwc-list-item>
          `
        )}
      </ha-button-menu>
    `;
  }

  private _addCondition(ev: CustomEvent<ActionDetail>) {
    const condition = (ev.currentTarget as HaSelect).items[ev.detail.index]
      .value as Condition["condition"];

    const elClass = customElements.get(
      `ha-automation-condition-${condition}`
    ) as CustomElementConstructor & {
      defaultConfig: Omit<Condition, "condition">;
    };

    const conditions = this.conditions.concat({
      condition: condition as any,
      ...elClass.defaultConfig,
    });
    this._focusLastConditionOnChange = true;
    fireEvent(this, "value-changed", { value: conditions });
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const conditions = [...this.conditions];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      conditions.splice(index, 1);
    } else {
      conditions[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: conditions });
  }

  private _duplicateCondition(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    fireEvent(this, "value-changed", {
      value: this.conditions.concat(deepClone(this.conditions[index])),
    });
  }

  private _processedTypes = memoizeOne(
    (localize: LocalizeFunc): [string, string][] =>
      CONDITION_TYPES.map(
        (condition) =>
          [
            condition,
            localize(
              `ui.panel.config.automation.editor.conditions.type.${condition}.label`
            ),
          ] as [string, string]
      ).sort((a, b) => stringCompare(a[1], b[1]))
  );

  static get styles(): CSSResultGroup {
    return css`
      ha-automation-condition-row {
        display: block;
        margin-bottom: 16px;
      }
      ha-svg-icon {
        height: 20px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition": HaAutomationCondition;
  }
}
