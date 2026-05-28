import { consume } from "@lit/context";
import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { transform } from "../../common/decorators/transform";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import { statesContext } from "../../data/context";
import type { AttributeSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../entity/ha-entity-attribute-picker";

@customElement("ha-selector-attribute")
export class HaSelectorAttribute extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: AttributeSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    filter_entity?: string | string[];
  };

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, HassEntity[] | undefined>({
    transformer: function (this: HaSelectorAttribute, states) {
      if (!states) {
        return undefined;
      }
      const entityId =
        this.selector.attribute?.entity_id || this.context?.filter_entity;
      if (!entityId) {
        return undefined;
      }
      const ids = ensureArray(entityId);
      return ids
        .map((id) => states[id])
        .filter(
          (entityState): entityState is HassEntity => entityState !== undefined
        );
    },
    watch: ["selector", "context"],
  })
  private _filterEntityStates?: HassEntity[];

  protected render() {
    return html`
      <ha-entity-attribute-picker
        .hass=${this.hass}
        .entityId=${this.selector.attribute?.entity_id ||
        this.context?.filter_entity}
        .hideAttributes=${this.selector.attribute?.hide_attributes}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        allow-custom-value
      ></ha-entity-attribute-picker>
    `;
  }

  protected updated(changedProps: PropertyValues<this>): void {
    super.updated(changedProps);
    if (
      // No need to filter value if no value
      !this.value ||
      // Only adjust value if we used the context
      this.selector.attribute?.entity_id ||
      // Only check if context has changed
      !changedProps.has("context")
    ) {
      return;
    }

    const oldContext = changedProps.get("context") as this["context"];

    if (
      !this.context ||
      !oldContext ||
      oldContext.filter_entity === this.context.filter_entity
    ) {
      return;
    }

    // Validate that that the attribute is still valid for this entity, else unselect.
    let invalid: boolean;
    if (this.context.filter_entity) {
      const entityIds = ensureArray(this.context.filter_entity);

      invalid = !entityIds.some((entityId) => {
        const stateObj = this._filterEntityStates?.find(
          (entityState) => entityState.entity_id === entityId
        );
        return (
          stateObj &&
          this.value in stateObj.attributes &&
          stateObj.attributes[this.value] !== undefined
        );
      });
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
    "ha-selector-attribute": HaSelectorAttribute;
  }
}
