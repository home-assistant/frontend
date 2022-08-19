import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
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
    filter_entity?: string;
  };

  protected render() {
    return html`
      <ha-entity-state-picker
        .hass=${this.hass}
        .entityId=${this.selector.state.entity_id ||
        this.context?.filter_entity}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        allow-custom-value
      ></ha-entity-state-picker>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (
      // No need to filter value if no value
      !this.value ||
      // Only adjust value if we used the context
      this.selector.state.entity_id ||
      // Only check if context has changed
      !changedProps.has("context")
    ) {
      return;
    }

    const oldContext = changedProps.get("context") as this["context"];

    if (
      !this.context ||
      oldContext?.filter_entity === this.context.filter_entity
    ) {
      return;
    }

    // Validate that that the attribute is still valid for this entity, else unselect.
    let invalid = false;
    if (this.context.filter_entity) {
      const stateObj = this.hass.states[this.context.filter_entity];

      if (!(stateObj && this.value in stateObj.attributes)) {
        invalid = true;
      }
    } else {
      invalid = this.value !== undefined;
    }

    if (invalid) {
      fireEvent(this, "value-changed", {
        value: undefined,
      });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-state": HaSelectorState;
  }
}
