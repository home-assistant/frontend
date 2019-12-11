import {
  LitElement,
  TemplateResult,
  property,
  html,
  customElement,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button-light";

import { HomeAssistant } from "../../types";
import { PolymerChangedEvent } from "../../polymer-types";
import { fireEvent } from "../../common/dom/fire_event";
import { isValidEntityId } from "../../common/entity/valid_entity_id";

import "./ha-entity-picker";
// Not a duplicate, type import
// tslint:disable-next-line
import { HaEntityPickerEntityFilterFunc } from "./ha-entity-picker";
import { HassEntity } from "home-assistant-js-websocket";

@customElement("ha-entities-picker")
class HaEntitiesPickerLight extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public value?: string[];
  /**
   * Show entities from specific domains.
   * @type {Array}
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

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return;
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
