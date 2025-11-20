import type { HassServiceTarget } from "home-assistant-js-websocket";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { StateSelector } from "../../data/selector";
import { extractFromTarget } from "../../data/target";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../types";
import "../entity/ha-entity-state-picker";
import "../entity/ha-entity-states-picker";

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
    filter_target?: HassServiceTarget;
  };

  @state() private _entityIds?: string | string[];

  willUpdate(changedProps) {
    if (changedProps.has("selector") || changedProps.has("context")) {
      this._resolveEntityIds(
        this.selector.state?.entity_id,
        this.context?.filter_entity,
        this.context?.filter_target
      ).then((entityIds) => {
        this._entityIds = entityIds;
      });
    }
  }

  protected render() {
    if (this.selector.state?.multiple) {
      return html`
        <ha-entity-states-picker
          .hass=${this.hass}
          .entityId=${this._entityIds}
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
        ></ha-entity-states-picker>
      `;
    }
    return html`
      <ha-entity-state-picker
        .hass=${this.hass}
        .entityId=${this._entityIds}
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

  private async _resolveEntityIds(
    selectorEntityId: string | string[] | undefined,
    contextFilterEntity: string | string[] | undefined,
    contextFilterTarget: HassServiceTarget | undefined
  ): Promise<string | string[] | undefined> {
    if (selectorEntityId !== undefined) {
      return selectorEntityId;
    }
    if (contextFilterEntity !== undefined) {
      return contextFilterEntity;
    }
    if (contextFilterTarget !== undefined) {
      const result = await extractFromTarget(this.hass, contextFilterTarget);
      return result.referenced_entities;
    }
    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-state": HaSelectorState;
  }
}
