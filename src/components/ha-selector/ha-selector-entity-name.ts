import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { EntityNameSelector } from "../../data/selector";
import "../entity/ha-entity-name-picker";

@customElement("ha-selector-entity_name")
export class HaSelectorEntityName extends LitElement {
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
    return html`
      <ha-entity-name-picker
        .entityId=${
          this.selector.entity_name?.entity_id || this.context?.entity
        }
        .value=${this.value}
        .defaultValue=${this.selector.entity_name?.default_name}
        .allowCustom=${this.selector.entity_name?.allow_custom ?? true}
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
