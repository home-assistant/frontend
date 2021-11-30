import "@polymer/paper-input/paper-input";
import { html, LitElement, PropertyValues } from "lit";
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
import { fireEvent } from "../../../../../common/dom/fire_event";

@customElement("ha-automation-condition-state")
export class HaStateCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public condition!: StateCondition;

  public static get defaultConfig() {
    return { entity_id: "", state: "" };
  }

  public willUpdate(changedProperties: PropertyValues): boolean {
    if (
      changedProperties.has("condition") &&
      Array.isArray(this.condition?.state)
    ) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(this.hass.localize("ui.errors.config.no_state_array_support"))
      );
      // We have to stop the update if state is an array.
      // Otherwise the state will be changed to a comma-separated string by the input element.
      return false;
    }
    return true;
  }

  protected render() {
    const { entity_id, attribute, state } = this.condition;
    const forTime = createDurationData(this.condition.for);

    return html`
      <ha-entity-picker
        .value=${entity_id}
        .name=${"entity_id"}
        @value-changed=${this._valueChanged}
        .hass=${this.hass}
        allow-custom-entity
      ></ha-entity-picker>
      <ha-entity-attribute-picker
        .hass=${this.hass}
        .entityId=${entity_id}
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
        .value=${state}
        @value-changed=${this._valueChanged}
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-state": HaStateCondition;
  }
}
