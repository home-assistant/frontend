import type { HassEntity } from "home-assistant-js-websocket";
import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import { isValidEntityId } from "../../common/entity/valid_entity_id";
import type { PolymerChangedEvent } from "../../polymer-types";
import type { HomeAssistant } from "../../types";
import "./ha-entity-picker";
import type { HaEntityPickerEntityFilterFunc } from "./ha-entity-picker";

@customElement("ha-entities-picker")
class HaEntitiesPickerLight extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public value?: string[];

  /**
   * Show entities from specific domains.
   * @type {string}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  @property({ attribute: "picked-entity-label" })
  public pickedEntityLabel?: string;

  @property({ attribute: "pick-entity-label" }) public pickEntityLabel?: string;

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    const currentEntities = this._currentEntities;
    return html`
      ${currentEntities.map(
        (entityId) => html`
          <div>
            <ha-entity-picker
              allow-custom-entity
              .curValue=${entityId}
              .hass=${this.hass}
              .includeDomains=${this.includeDomains}
              .excludeDomains=${this.excludeDomains}
              .entityFilter=${this._entityFilter}
              .value=${entityId}
              .label=${this.pickedEntityLabel}
              @value-changed=${this._entityChanged}
            ></ha-entity-picker>
          </div>
        `
      )}
      <div>
        <ha-entity-picker
          .hass=${this.hass}
          .includeDomains=${this.includeDomains}
          .excludeDomains=${this.excludeDomains}
          .entityFilter=${this._entityFilter}
          .label=${this.pickEntityLabel}
          @value-changed=${this._addEntity}
        ></ha-entity-picker>
      </div>
    `;
  }

  private _entityFilter: HaEntityPickerEntityFilterFunc = (
    stateObj: HassEntity
  ) => !this.value || !this.value.includes(stateObj.entity_id);

  private get _currentEntities() {
    return this.value || [];
  }

  private async _updateEntities(entities) {
    fireEvent(this, "value-changed", {
      value: entities,
    });

    this.value = entities;
  }

  private _entityChanged(event: PolymerChangedEvent<string>) {
    event.stopPropagation();
    const curValue = (event.currentTarget as any).curValue;
    const newValue = event.detail.value;
    if (
      newValue === curValue ||
      (newValue !== "" && !isValidEntityId(newValue))
    ) {
      return;
    }
    if (newValue === "") {
      this._updateEntities(
        this._currentEntities.filter((ent) => ent !== curValue)
      );
    } else {
      this._updateEntities(
        this._currentEntities.map((ent) => (ent === curValue ? newValue : ent))
      );
    }
  }

  private async _addEntity(event: PolymerChangedEvent<string>) {
    event.stopPropagation();
    const toAdd = event.detail.value;
    (event.currentTarget as any).value = "";
    if (!toAdd) {
      return;
    }
    const currentEntities = this._currentEntities;
    if (currentEntities.includes(toAdd)) {
      return;
    }

    this._updateEntities([...currentEntities, toAdd]);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entities-picker": HaEntitiesPickerLight;
  }
}
