import "../ha-list-item";
import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import {
  fuzzyFilterSort,
  ScorableTextItem,
} from "../../common/string/filter/sequence-matching";
import { ValueChangedEvent, HomeAssistant } from "../../types";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-icon-button";
import "../ha-svg-icon";
import "./state-badge";
import { caseInsensitiveStringCompare } from "../../common/string/compare";

interface HassEntityWithCachedName extends HassEntity, ScorableTextItem {
  friendly_name: string;
}

export type HaEntityPickerEntityFilterFunc = (entity: HassEntity) => boolean;

// eslint-disable-next-line lit/prefer-static-styles
const rowRenderer: ComboBoxLitRenderer<HassEntityWithCachedName> = (item) =>
  html`<ha-list-item graphic="avatar" .twoline=${!!item.entity_id}>
    ${item.state
      ? html`<state-badge slot="graphic" .stateObj=${item}></state-badge>`
      : ""}
    <span>${item.friendly_name}</span>
    <span slot="secondary">${item.entity_id}</span>
  </ha-list-item>`;

@customElement("ha-entity-picker")
export class HaEntityPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean }) public required?: boolean;

  @property({ type: Boolean, attribute: "allow-custom-entity" })
  public allowCustomEntity;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

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

  @property() public entityFilter?: HaEntityPickerEntityFilterFunc;

  @property({ type: Boolean }) public hideClearIcon = false;

  @property({ attribute: "item-label-path" }) public itemLabelPath =
    "friendly_name";

  @state() private _opened = false;

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  public async open() {
    await this.updateComplete;
    await this.comboBox?.open();
  }

  public async focus() {
    await this.updateComplete;
    await this.comboBox?.focus();
  }

  private _initedStates = false;

  private _states: HassEntityWithCachedName[] = [];

  private _getStates = memoizeOne(
    (
      _opened: boolean,
      hass: this["hass"],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      entityFilter: this["entityFilter"],
      includeDeviceClasses: this["includeDeviceClasses"],
      includeUnitOfMeasurement: this["includeUnitOfMeasurement"],
      includeEntities: this["includeEntities"],
      excludeEntities: this["excludeEntities"]
    ): HassEntityWithCachedName[] => {
      let states: HassEntityWithCachedName[] = [];

      if (!hass) {
        return [];
      }
      let entityIds = Object.keys(hass.states);

      if (!entityIds.length) {
        return [
          {
            entity_id: "",
            state: "",
            last_changed: "",
            last_updated: "",
            context: { id: "", user_id: null, parent_id: null },
            friendly_name: this.hass!.localize(
              "ui.components.entity.entity-picker.no_entities"
            ),
            attributes: {
              friendly_name: this.hass!.localize(
                "ui.components.entity.entity-picker.no_entities"
              ),
              icon: "mdi:magnify",
            },
            strings: [],
          },
        ];
      }

      if (includeEntities) {
        entityIds = entityIds.filter((entityId) =>
          this.includeEntities!.includes(entityId)
        );

        return entityIds
          .map((key) => {
            const friendly_name = computeStateName(hass!.states[key]) || key;
            return {
              ...hass!.states[key],
              friendly_name,
              strings: [key, friendly_name],
            };
          })
          .sort((entityA, entityB) =>
            caseInsensitiveStringCompare(
              entityA.friendly_name,
              entityB.friendly_name,
              this.hass.locale.language
            )
          );
      }

      if (excludeEntities) {
        entityIds = entityIds.filter(
          (entityId) => !excludeEntities!.includes(entityId)
        );
      }

      if (includeDomains) {
        entityIds = entityIds.filter((eid) =>
          includeDomains.includes(computeDomain(eid))
        );
      }

      if (excludeDomains) {
        entityIds = entityIds.filter(
          (eid) => !excludeDomains.includes(computeDomain(eid))
        );
      }

      states = entityIds
        .map((key) => {
          const friendly_name = computeStateName(hass!.states[key]) || key;
          return {
            ...hass!.states[key],
            friendly_name,
            strings: [key, friendly_name],
          };
        })
        .sort((entityA, entityB) =>
          caseInsensitiveStringCompare(
            entityA.friendly_name,
            entityB.friendly_name,
            this.hass.locale.language
          )
        );

      if (includeDeviceClasses) {
        states = states.filter(
          (stateObj) =>
            // We always want to include the entity of the current value
            stateObj.entity_id === this.value ||
            (stateObj.attributes.device_class &&
              includeDeviceClasses.includes(stateObj.attributes.device_class))
        );
      }

      if (includeUnitOfMeasurement) {
        states = states.filter(
          (stateObj) =>
            // We always want to include the entity of the current value
            stateObj.entity_id === this.value ||
            (stateObj.attributes.unit_of_measurement &&
              includeUnitOfMeasurement.includes(
                stateObj.attributes.unit_of_measurement
              ))
        );
      }

      if (entityFilter) {
        states = states.filter(
          (stateObj) =>
            // We always want to include the entity of the current value
            stateObj.entity_id === this.value || entityFilter!(stateObj)
        );
      }

      if (!states.length) {
        return [
          {
            entity_id: "",
            state: "",
            last_changed: "",
            last_updated: "",
            context: { id: "", user_id: null, parent_id: null },
            friendly_name: this.hass!.localize(
              "ui.components.entity.entity-picker.no_match"
            ),
            attributes: {
              friendly_name: this.hass!.localize(
                "ui.components.entity.entity-picker.no_match"
              ),
              icon: "mdi:magnify",
            },
            strings: [],
          },
        ];
      }

      return states;
    }
  );

  protected shouldUpdate(changedProps: PropertyValues) {
    if (
      changedProps.has("value") ||
      changedProps.has("label") ||
      changedProps.has("disabled")
    ) {
      return true;
    }
    return !(!changedProps.has("_opened") && this._opened);
  }

  public willUpdate(changedProps: PropertyValues) {
    if (!this._initedStates || (changedProps.has("_opened") && this._opened)) {
      this._states = this._getStates(
        this._opened,
        this.hass,
        this.includeDomains,
        this.excludeDomains,
        this.entityFilter,
        this.includeDeviceClasses,
        this.includeUnitOfMeasurement,
        this.includeEntities,
        this.excludeEntities
      );
      if (this._initedStates) {
        this.comboBox.filteredItems = this._states;
      }
      this._initedStates = true;
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-combo-box
        item-value-path="entity_id"
        .itemLabelPath=${this.itemLabelPath}
        .hass=${this.hass}
        .value=${this._value}
        .label=${this.label === undefined
          ? this.hass.localize("ui.components.entity.entity-picker.entity")
          : this.label}
        .helper=${this.helper}
        .allowCustomValue=${this.allowCustomEntity}
        .filteredItems=${this._states}
        .renderer=${rowRenderer}
        .required=${this.required}
        .disabled=${this.disabled}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
        @filter-changed=${this._filterChanged}
      >
      </ha-combo-box>
    `;
  }

  private get _value() {
    return this.value || "";
  }

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const newValue = ev.detail.value;
    if (newValue !== this._value) {
      this._setValue(newValue);
    }
  }

  private _filterChanged(ev: CustomEvent): void {
    const target = ev.target as HaComboBox;
    const filterString = ev.detail.value.toLowerCase();
    target.filteredItems = filterString.length
      ? fuzzyFilterSort<HassEntityWithCachedName>(filterString, this._states)
      : this._states;
  }

  private _setValue(value: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-picker": HaEntityPicker;
  }
}
