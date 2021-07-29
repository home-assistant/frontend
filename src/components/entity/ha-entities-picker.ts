import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { isValidEntityId } from "../../common/entity/valid_entity_id";
import type { PolymerChangedEvent } from "../../polymer-types";
import type { HomeAssistant } from "../../types";
import "./ha-entity-picker";
import type { HaEntityPickerEntityFilterFunc } from "./ha-entity-picker";

@customElement("ha-entities-picker")
class HaEntitiesPickerLight extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Array }) public value?: string[];

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

  /**
   * Show only entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  /**
   * Show only entities with these unit of measuments.
   * @type {Array}
   * @attr include-unit-of-measurement
   */
  @property({ type: Array, attribute: "include-unit-of-measurement" })
  public includeUnitOfMeasurement?: string[];

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
              .includeDeviceClasses=${this.includeDeviceClasses}
              .includeUnitOfMeasurement=${this.includeUnitOfMeasurement}
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
          .includeDeviceClasses=${this.includeDeviceClasses}
          .includeUnitOfMeasurement=${this.includeUnitOfMeasurement}
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
    this.value = entities;

    fireEvent(this, "value-changed", {
      value: entities,
    });
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
    const currentEntities = this._currentEntities;
    if (!newValue || currentEntities.includes(newValue)) {
      this._updateEntities(currentEntities.filter((ent) => ent !== curValue));
      return;
    }
    this._updateEntities(
      currentEntities.map((ent) => (ent === curValue ? newValue : ent))
    );
  }

  private async _addEntity(event: PolymerChangedEvent<string>) {
    event.stopPropagation();
    const toAdd = event.detail.value;
    if (!toAdd) {
      return;
    }
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
