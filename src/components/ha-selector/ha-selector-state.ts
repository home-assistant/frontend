import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { StateSelector } from "../../data/selector";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../types";
import "../entity/ha-entity-state-picker";

@customElement("ha-selector-state")
export class HaSelectorState extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;

  @property() public selector!: StateSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property() public context?: {
    filter_attribute?: string;
    filter_entity?: string;
  };

  protected render() {
    const fullLabel = `${this.label}${
      !this.selector.state.attribute && this.selector.state.entity_id
        ? this.hass.states[this.selector.state.entity_id].attributes
            ?.unit_of_measurement
          ? " (" +
            this.hass.states[this.selector.state.entity_id].attributes
              ?.unit_of_measurement +
            ")"
          : ""
        : ""
    }`;

    return html`
      <ha-entity-state-picker
        .hass=${this.hass}
        .entityId=${this.selector.state.entity_id ||
        this.context?.filter_entity}
        .attribute=${this.selector.state.attribute ||
        this.context?.filter_attribute}
        .value=${this.value}
        .label=${fullLabel}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        allow-custom-value
      ></ha-entity-state-picker>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-state": HaSelectorState;
  }
}
