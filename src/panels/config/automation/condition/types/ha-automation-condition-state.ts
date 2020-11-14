import "@polymer/paper-input/paper-input";
import { customElement, html, LitElement, property } from "lit-element";
import "../../../../../components/entity/ha-entity-attribute-picker";
import "../../../../../components/entity/ha-entity-picker";
import { StateCondition } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  ConditionElement,
  handleChange,
  handleChangeEvent,
} from "../ha-automation-condition-row";

@customElement("ha-automation-condition-state")
export class HaStateCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public condition!: StateCondition;

  public static get defaultConfig() {
    return { entity_id: "", state: [""] };
  }

  protected render() {
    const { entity_id, attribute, state } = this.condition;

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
      ${state.map(
        (value, idx) => html` <paper-input
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.type.state.state"
          )}
          .name=${"state-" + idx}
          .value=${value}
          @value-changed=${this._stateValueChanged}
        ></paper-input>`
      )}
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  private _stateValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value;
    const idx = (ev.target as any)?.name.split("-").pop();

    if ((this.condition.state[idx] || "") === value) {
      return;
    }

    this.condition.state[idx] = value;
    handleChange(this, "state", this.condition.state);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-state": HaStateCondition;
  }
}
