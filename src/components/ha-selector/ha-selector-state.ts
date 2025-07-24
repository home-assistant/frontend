import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { StateSelector } from "../../data/selector";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../types";
import "../entity/ha-entity-state-picker";

@customElement("ha-selector-state")
export class HaSelectorState extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: StateSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    filter_attribute?: string;
    filter_entity?: string | string[];
  };

  protected render() {
    return html`
      <ha-entity-state-picker
        .hass=${this.hass}
        .entityId=${this.selector.state?.entity_id ||
        this.context?.filter_entity}
        .attribute=${this.selector.state?.attribute ||
        this.context?.filter_attribute}
        .extraOptions=${this.selector.state?.extra_options}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        allow-custom-value
        .hideStates=${this.selector.state?.hide_states}
      ></ha-entity-state-picker>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-state": HaSelectorState;
  }
}
