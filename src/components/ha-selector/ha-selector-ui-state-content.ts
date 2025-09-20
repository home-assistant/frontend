import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { UiStateContentSelector } from "../../data/selector";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../types";
import "../entity/ha-entity-state-content-picker";

@customElement("ha-selector-ui_state_content")
export class HaSelectorUiStateContent extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: UiStateContentSelector;

  @property() public value?: string | string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    filter_entity?: string;
  };

  protected render() {
    return html`
      <ha-entity-state-content-picker
        .hass=${this.hass}
        .entityId=${this.selector.ui_state_content?.entity_id ||
        this.context?.filter_entity}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .allowName=${this.selector.ui_state_content?.allow_name}
        .allowArea=${this.selector.ui_state_content?.allow_area}
        .allowDevice=${this.selector.ui_state_content?.allow_device}
      ></ha-entity-state-content-picker>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-ui_state_content": HaSelectorUiStateContent;
  }
}
