import { mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-svg-icon";
import { Condition } from "../../../../data/automation";
import { HomeAssistant } from "../../../../types";
import "./ha-automation-condition-row";
import type HaAutomationConditionRow from "./ha-automation-condition-row";
import { HaDeviceCondition } from "./types/ha-automation-condition-device";

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
      row.toggleExpanded();
      row.focus();
    }
  }

  protected render() {
    if (!Array.isArray(this.conditions)) {
      return html``;
    }
    return html`
      ${this.conditions.map(
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
      <mwc-button
        outlined
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.add"
        )}
        @click=${this._addCondition}
      >
        <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
      </mwc-button>
    `;
  }

  private _addCondition() {
    const conditions = this.conditions.concat({
      condition: "device",
      ...HaDeviceCondition.defaultConfig,
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
