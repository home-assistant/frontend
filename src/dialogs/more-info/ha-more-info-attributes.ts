import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeAttributeNameDisplay } from "../../common/entity/compute_attribute_display";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import "../../components/ha-attribute-value";
import "../../components/ha-card";
import {
  STATE_ATTRIBUTES,
  STATE_ATTRIBUTES_DOMAIN_CLASS,
} from "../../data/entity/entity_attributes";
import type { ExtEntityRegistryEntry } from "../../data/entity/entity_registry";
import type { HomeAssistant } from "../../types";

interface AttributesViewParams {
  entityId: string;
}

@customElement("ha-more-info-attributes")
class HaMoreInfoAttributes extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public params?: AttributesViewParams;

  @state() private _stateObj?: HassEntity;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("params") || changedProps.has("hass")) {
      if (this.params?.entityId && this.hass) {
        this._stateObj = this.hass.states[this.params.entityId];
      }
    }
  }

  private _computeDisplayAttributes(stateObj: HassEntity): string[] {
    const domain = computeStateDomain(stateObj);
    const filtersArray = STATE_ATTRIBUTES.concat(
      (STATE_ATTRIBUTES_DOMAIN_CLASS[domain]?.[
        stateObj.attributes?.device_class
      ] || []) as string[]
    );
    return Object.keys(stateObj.attributes).filter(
      (key) => filtersArray.indexOf(key) === -1
    );
  }

  protected render() {
    if (!this.params || !this._stateObj) {
      return nothing;
    }

    const attributes = this._computeDisplayAttributes(this._stateObj);

    return html`
      <div class="content">
        <ha-card>
          <div class="card-content">
            ${attributes.map(
              (attribute) => html`
                <div class="data-entry">
                  <div class="key">
                    ${computeAttributeNameDisplay(
                      this.hass.localize,
                      this._stateObj!,
                      this.hass.entities,
                      attribute
                    )}
                  </div>
                  <div class="value">
                    <ha-attribute-value
                      .hass=${this.hass}
                      .attribute=${attribute}
                      .stateObj=${this._stateObj}
                    ></ha-attribute-value>
                  </div>
                </div>
              `
            )}
          </div>
        </ha-card>
        ${this._stateObj.attributes.attribution
          ? html`
              <div class="attribution">
                ${this._stateObj.attributes.attribution}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .content {
      padding: var(--ha-space-6);
      padding-bottom: max(var(--safe-area-inset-bottom), var(--ha-space-6));
    }

    ha-card {
      direction: ltr;
    }

    .card-content {
      padding: var(--ha-space-2) var(--ha-space-4);
    }

    .data-entry {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      padding: var(--ha-space-2) 0;
      border-bottom: 1px solid var(--divider-color);
    }

    .data-entry:last-of-type {
      border-bottom: none;
    }

    .data-entry .value {
      max-width: 60%;
      overflow-wrap: break-word;
      text-align: right;
    }

    .key {
      flex-grow: 1;
      color: var(--secondary-text-color);
    }

    .attribution {
      color: var(--secondary-text-color);
      text-align: center;
      margin-top: var(--ha-space-4);
      font-size: var(--ha-font-size-s);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-attributes": HaMoreInfoAttributes;
  }
}
