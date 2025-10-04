import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { EntityNameSelector } from "../../data/selector";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../types";
import "../entity/ha-entity-name-picker";

@customElement("ha-selector-entity_name")
export class HaSelectorEntityName extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: EntityNameSelector;

  @property() public value?: string | string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    entity?: string;
  };

  protected render() {
    const value = this.value ?? this.selector.entity_name?.default_name;

    return html`
      <ha-entity-name-picker
        .hass=${this.hass}
        .entityId=${this.selector.entity_name?.entity_id ||
        this.context?.entity}
        .value=${value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-entity-name-picker>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-entity_name": HaSelectorEntityName;
  }
}
