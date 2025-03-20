import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import {
  computeEntityAreaName,
  computeEntityDeviceName,
  computeEntityName,
} from "../../common/entity/compute_entity_name";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import type { ScorableTextItem } from "../../common/string/filter/sequence-matching";
import { fuzzyFilterSort } from "../../common/string/filter/sequence-matching";
import { domainToName } from "../../data/integration";
import type { HelperDomain } from "../../panels/config/helpers/const";
import { isHelperDomain } from "../../panels/config/helpers/const";
import { showHelperDetailDialog } from "../../panels/config/helpers/show-dialog-helper-detail";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-icon-button";
import "../ha-list-item";
import "../ha-svg-icon";
import "./state-badge";

interface HassEntityWithCachedName extends HassEntity, ScorableTextItem {
  displayed_name: string;
  entity_name?: string;
  entity_context?: string;
}

export type HaEntityPickerEntityFilterFunc = (entity: HassEntity) => boolean;

const CREATE_ID = "___create-new-entity___";

@customElement("ha-entity-picker")
export class HaEntityPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "allow-custom-entity" })
  public allowCustomEntity;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property({ attribute: false, type: Array }) public createDomains?: string[];

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
   * List of allowed entities to show.
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

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

  @property({ attribute: "item-label-path" }) public itemLabelPath =
    "displayed_name";

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

  private _rowRenderer: ComboBoxLitRenderer<HassEntityWithCachedName> = (
    item
  ) => html`
    <ha-list-item
      graphic="avatar"
      .twoline=${!!item.entity_id}
      multiline-secondary
    >
      ${item.state
        ? html`
            <state-badge
              slot="graphic"
              .stateObj=${item}
              .hass=${this.hass}
            ></state-badge>
          `
        : nothing}
      <span>${item.entity_name ?? item.displayed_name}</span>
      ${item.entity_context
        ? html`
            <div slot="secondary" style="margin-bottom: 6px">
              ${item.entity_context}
            </div>
          `
        : nothing}
      <div slot="secondary">
        ${item.entity_id.startsWith(CREATE_ID)
          ? this.hass.localize("ui.components.entity.entity-picker.new_entity")
          : item.entity_id}
      </div>
    </ha-list-item>
  `;

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
      excludeEntities: this["excludeEntities"],
      createDomains: this["createDomains"]
    ): HassEntityWithCachedName[] => {
      let states: HassEntityWithCachedName[] = [];

      if (!hass) {
        return [];
      }
      let entityIds = Object.keys(hass.states);

      const createItems = createDomains?.length
        ? createDomains.map<HassEntityWithCachedName>((domain) => {
            const displayedName = hass.localize(
              "ui.components.entity.entity-picker.create_helper",
              {
                domain: isHelperDomain(domain)
                  ? hass.localize(
                      `ui.panel.config.helpers.types.${domain as HelperDomain}`
                    )
                  : domainToName(hass.localize, domain),
              }
            );

            return {
              entity_id: CREATE_ID + domain,
              state: "on",
              last_changed: "",
              last_updated: "",
              context: { id: "", user_id: null, parent_id: null },
              displayed_name: displayedName,
              attributes: {
                icon: "mdi:plus",
              },
              strings: [domain, displayedName],
            };
          })
        : [];

      if (!entityIds.length) {
        return [
          {
            entity_id: "",
            state: "",
            last_changed: "",
            last_updated: "",
            context: { id: "", user_id: null, parent_id: null },
            displayed_name: this.hass!.localize(
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
          ...createItems,
        ];
      }

      if (includeEntities) {
        entityIds = entityIds.filter((entityId) =>
          includeEntities.includes(entityId)
        );
      }

      if (excludeEntities) {
        entityIds = entityIds.filter(
          (entityId) => !excludeEntities.includes(entityId)
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
        .map((key) => this._stateObjToRowItem(hass!.states[key], hass))
        .sort((entityA, entityB) =>
          caseInsensitiveStringCompare(
            entityA.displayed_name,
            entityB.displayed_name,
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
            displayed_name: this.hass!.localize(
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
          ...createItems,
        ];
      }

      if (createItems?.length) {
        states.push(...createItems);
      }

      return states;
    }
  );

  private _stateObjToRowItem(
    stateObj: HassEntity,
    hass: HomeAssistant
  ): HassEntityWithCachedName {
    const areaName = computeEntityAreaName(
      stateObj,
      hass.entities,
      hass.devices,
      hass.areas
    );
    const deviceName = computeEntityDeviceName(
      stateObj,
      hass.entities,
      hass.devices
    );

    const entityName = computeEntityName(stateObj, hass.entities, hass.devices);

    const displayedName = [deviceName, entityName].filter(Boolean).join(" ⸱ ");

    // Do not include device name if it's the same as entity name
    const entityContext = [
      entityName !== deviceName ? deviceName : undefined,
      areaName,
    ]
      .filter(Boolean)
      .join(" ⸱ ");

    return {
      ...stateObj,
      displayed_name: displayedName,
      strings: [
        stateObj.entity_id,
        displayedName,
        areaName ?? "",
        deviceName ?? "",
      ].filter(Boolean),
      entity_name: entityName,
      entity_context: entityContext,
    };
  }

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
        this.excludeEntities,
        this.createDomains
      );
      if (this._initedStates) {
        this.comboBox.filteredItems = this._states;
      }
      this._initedStates = true;
    }

    if (changedProps.has("createDomains") && this.createDomains?.length) {
      this.hass.loadFragmentTranslation("config");
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
        .renderer=${this._rowRenderer}
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

  private _valueChanged(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    const newValue = ev.detail.value?.trim();

    if (newValue && newValue.startsWith(CREATE_ID)) {
      const domain = newValue.substring(CREATE_ID.length);
      showHelperDetailDialog(this, {
        domain,
        dialogClosedCallback: (item) => {
          if (item.entityId) this._setValue(item.entityId);
        },
      });
      return;
    }

    if (newValue !== this._value) {
      this._setValue(newValue);
    }
  }

  private _filterChanged(ev: CustomEvent): void {
    const target = ev.target as HaComboBox;
    const filterString = ev.detail.value.trim().toLowerCase();
    target.filteredItems = filterString.length
      ? fuzzyFilterSort<HassEntityWithCachedName>(filterString, this._states)
      : this._states;
  }

  private _setValue(value: string | undefined) {
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
