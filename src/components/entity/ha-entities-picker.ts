import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { isValidEntityId } from "../../common/entity/valid_entity_id";
import type { ValueChangedEvent, HomeAssistant } from "../../types";
import "./ha-entity-picker";
import type { HaEntityPickerEntityFilterFunc } from "./ha-entity-picker";

@customElement("ha-entities-picker")
class HaEntitiesPickerLight extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Array }) public value?: string[];

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean }) public required?: boolean;

  @property() public helper?: string;

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

  /**
   * List of allowed entities to show. Will ignore all other filters.
   * @type {Array}
   * @attr include-entities
   */
  @property({ type: Array, attribute: "include-entities" })
  public includeEntities?: string[];

  /**
   * List of entities to be excluded.
   * @type {Array}
   * @attr exclude-entities
   */
  @property({ type: Array, attribute: "exclude-entities" })
  public excludeEntities?: string[];

  @property({ attribute: "picked-entity-label" })
  public pickedEntityLabel?: string;

  @property({ attribute: "pick-entity-label" }) public pickEntityLabel?: string;

  @property() public entityFilter?: HaEntityPickerEntityFilterFunc;

  protected render() {
    if (!this.hass) {
      return nothing;
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
              .includeEntities=${this.includeEntities}
              .excludeEntities=${this.excludeEntities}
              .includeDeviceClasses=${this.includeDeviceClasses}
              .includeUnitOfMeasurement=${this.includeUnitOfMeasurement}
              .entityFilter=${this._getEntityFilter(
                this.value,
                this.entityFilter
              )}
              .value=${entityId}
              .label=${this.pickedEntityLabel}
              .disabled=${this.disabled}
              @value-changed=${this._entityChanged}
            ></ha-entity-picker>
          </div>
        `
      )}
      <div>
        <ha-entity-picker
          allow-custom-entity
          .hass=${this.hass}
          .includeDomains=${this.includeDomains}
          .excludeDomains=${this.excludeDomains}
          .includeEntities=${this.includeEntities}
          .excludeEntities=${this.excludeEntities}
          .includeDeviceClasses=${this.includeDeviceClasses}
          .includeUnitOfMeasurement=${this.includeUnitOfMeasurement}
          .entityFilter=${this._getEntityFilter(this.value, this.entityFilter)}
          .label=${this.pickEntityLabel}
          .helper=${this.helper}
          .disabled=${this.disabled}
          .required=${this.required && !currentEntities.length}
          @value-changed=${this._addEntity}
        ></ha-entity-picker>
      </div>
    `;
  }

  private _getEntityFilter = memoizeOne(
    (
      value: string[] | undefined,
      entityFilter: HaEntityPickerEntityFilterFunc | undefined
    ): HaEntityPickerEntityFilterFunc =>
      (stateObj: HassEntity) =>
        (!value || !value.includes(stateObj.entity_id)) &&
        (!entityFilter || entityFilter(stateObj))
  );

  private get _currentEntities() {
    return this.value || [];
  }

  private async _updateEntities(entities) {
    this.value = entities;

    fireEvent(this, "value-changed", {
      value: entities,
    });
  }

  private _entityChanged(event: ValueChangedEvent<string>) {
    event.stopPropagation();
    const curValue = (event.currentTarget as any).curValue;
    const newValue = event.detail.value;
    if (
      newValue === curValue ||
      (newValue !== undefined && !isValidEntityId(newValue))
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

  private async _addEntity(event: ValueChangedEvent<string>) {
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

  static override styles = css`
    div {
      margin-top: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entities-picker": HaEntitiesPickerLight;
  }
}
