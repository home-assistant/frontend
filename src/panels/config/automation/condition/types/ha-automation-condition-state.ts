import "@polymer/paper-input/paper-input";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import "../../../../../components/entity/ha-entity-attribute-picker";
import "../../../../../components/entity/ha-entity-picker";
import { StateCondition } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  ConditionElement,
  handleChangeEvent,
} from "../ha-automation-condition-row";
import "../../../../../components/ha-duration-input";

@customElement("ha-automation-condition-state")
export class HaStateCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public condition!: StateCondition;

  public static get defaultConfig() {
    return { entity_id: "", state: "" };
  }

  protected render() {
    const { attribute } = this.condition;
    const stateString = this.coerceToCommaSeparatedString(this.condition.state);
    const entityIdString = this.coerceToCommaSeparatedString(
      this.condition.entity_id
    );
    const forTime = createDurationData(this.condition.for);

    return html`
      <ha-entity-picker
        .value=${entityIdString}
        .name=${"entity_id"}
        @value-changed=${this._arrayValueChanged}
        .hass=${this.hass}
        allow-custom-entity
      ></ha-entity-picker>
      <ha-entity-attribute-picker
        .hass=${this.hass}
        .entityId=${entityIdString}
        .value=${attribute}
        .name=${"attribute"}
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.attribute"
        )}
        @value-changed=${this._valueChanged}
        allow-custom-value
      ></ha-entity-attribute-picker>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.state.state"
        )}
        .name=${"state"}
        .value=${stateString}
        @value-changed=${this._arrayValueChanged}
      ></paper-input>
      <ha-duration-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.for"
        )}
        .name=${"for"}
        .data=${forTime}
        @value-changed=${this._valueChanged}
      ></ha-duration-input>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  private _arrayValueChanged(ev: CustomEvent): void {
    ev.detail.value = this.coerceToCorrectValueType(ev.detail.value);
    handleChangeEvent(this, ev);
  }

  private coerceToCorrectValueType(
    value: string | number
  ): string | number | string[] {
    const splitValue = typeof value === "string" ? value?.split(",") : null;
    return splitValue?.length ? splitValue : value;
  }

  private coerceToCommaSeparatedString(
    value: string | string[] | number
  ): string | number {
    return Array.isArray(value) ? value.join(",") : value;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-state": HaStateCondition;
  }
}
