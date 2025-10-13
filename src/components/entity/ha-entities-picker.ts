import { mdiDrag } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { isValidEntityId } from "../../common/entity/valid_entity_id";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-sortable";
import "./ha-entity-picker";
import type { HaEntityPickerEntityFilterFunc } from "./ha-entity-picker";

@customElement("ha-entities-picker")
class HaEntitiesPicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Array }) public value?: string[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property() public label?: string;

  @property() public placeholder?: string;

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

  @property({ attribute: false })
  public entityFilter?: HaEntityPickerEntityFilterFunc;

  @property({ attribute: false, type: Array }) public createDomains?: string[];

  @property({ type: Boolean })
  public reorder = false;

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const currentEntities = this._currentEntities;
    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-sortable
        .disabled=${!this.reorder || this.disabled}
        handle-selector=".entity-handle"
        @item-moved=${this._entityMoved}
      >
        <div class="list">
          ${currentEntities.map(
            (entityId) => html`
              <div class="entity">
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
                  .entityFilter=${this.entityFilter}
                  .value=${entityId}
                  .disabled=${this.disabled}
                  .createDomains=${this.createDomains}
                  @value-changed=${this._entityChanged}
                ></ha-entity-picker>
                ${this.reorder
                  ? html`
                      <ha-svg-icon
                        class="entity-handle"
                        .path=${mdiDrag}
                      ></ha-svg-icon>
                    `
                  : nothing}
              </div>
            `
          )}
        </div>
      </ha-sortable>
      <div>
        <ha-entity-picker
          allow-custom-entity
          .hass=${this.hass}
          .includeDomains=${this.includeDomains}
          .excludeDomains=${this.excludeDomains}
          .includeEntities=${this.includeEntities}
          .excludeEntities=${this._excludeEntities(
            this.value,
            this.excludeEntities
          )}
          .includeDeviceClasses=${this.includeDeviceClasses}
          .includeUnitOfMeasurement=${this.includeUnitOfMeasurement}
          .entityFilter=${this.entityFilter}
          .placeholder=${this.placeholder}
          .helper=${this.helper}
          .disabled=${this.disabled}
          .createDomains=${this.createDomains}
          .required=${this.required && !currentEntities.length}
          @value-changed=${this._addEntity}
        ></ha-entity-picker>
      </div>
    `;
  }

  private _entityMoved(e: CustomEvent) {
    e.stopPropagation();
    const { oldIndex, newIndex } = e.detail;
    const currentEntities = this._currentEntities;
    const movedEntity = currentEntities[oldIndex];
    const newEntities = [...currentEntities];
    newEntities.splice(oldIndex, 1);
    newEntities.splice(newIndex, 0, movedEntity);
    this._updateEntities(newEntities);
  }

  private _excludeEntities = memoizeOne(
    (
      value: string[] | undefined,
      excludeEntities: string[] | undefined
    ): string[] | undefined => {
      if (value === undefined) {
        return excludeEntities;
      }
      return [...(excludeEntities || []), ...value];
    }
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
    label {
      display: block;
      margin: 0 0 8px;
    }
    .entity {
      display: flex;
      flex-direction: row;
      align-items: center;
    }
    .entity ha-entity-picker {
      flex: 1;
    }
    .entity-handle {
      padding: 8px;
      cursor: move; /* fallback if grab cursor is unsupported */
      cursor: grab;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entities-picker": HaEntitiesPicker;
  }
}
