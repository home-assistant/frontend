import "../entity/ha-entity-attribute-picker";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { AttributeSelector } from "../../data/selector";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../types";

@customElement("ha-selector-attribute")
export class HaSelectorAttribute extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;

  @property() public selector!: AttributeSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    return html`
      <ha-entity-attribute-picker
        .hass=${this.hass}
        .entityId=${this.selector.attribute.entity_id}
        .value=${this.value}
        .label=${this.label}
        .disabled=${this.disabled}
        allow-custom-value
      ></ha-entity-attribute-picker>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-attribute": HaSelectorAttribute;
  }
}
