import { mdiMagnify, mdiPlus } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeEntityName } from "../../common/entity/compute_entity_name";
import { computeStateName } from "../../common/entity/compute_state_name";
import { getEntityContext } from "../../common/entity/get_entity_context";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import { computeRTL } from "../../common/util/compute_rtl";
import { domainToName } from "../../data/integration";
import type { HelperDomain } from "../../panels/config/helpers/const";
import { isHelperDomain } from "../../panels/config/helpers/const";
import { showHelperDetailDialog } from "../../panels/config/helpers/show-dialog-helper-detail";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-combo-box-item";
import "../ha-icon-button";
import "../ha-list-item";
import "../ha-svg-icon";
import "./state-badge";

const FAKE_ENTITY: HassEntity = {
  entity_id: "",
  state: "",
  last_changed: "",
  last_updated: "",
  context: { id: "", user_id: null, parent_id: null },
  attributes: {},
};

interface EntityPickerItem extends HassEntity {
  label: string;
  primary: string;
  secondary?: string;
  translated_domain?: string;
  show_entity_id?: boolean;
  entity_name?: string;
  area_name?: string;
  device_name?: string;
  friendly_name?: string;
  sorting_label?: string;
  icon_path?: string;
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

  @property({ attribute: "item-label-path" }) public itemLabelPath = "label";

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

  private _initialItems = false;

  private items: EntityPickerItem[] = [];

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.hass.loadBackendTranslation("title");
  }

  private _rowRenderer: ComboBoxLitRenderer<EntityPickerItem> = (
    item,
    { index }
  ) => html`
    <ha-combo-box-item type="button" compact .borderTop=${index !== 0}>
      ${item.icon_path
        ? html`<ha-svg-icon slot="start" .path=${item.icon_path}></ha-svg-icon>`
        : html`
            <state-badge
              slot="start"
              .stateObj=${item}
              .hass=${this.hass}
            ></state-badge>
          `}

      <span slot="headline">${item.primary} </span>
      ${item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing}
      ${item.entity_id && item.show_entity_id
        ? html`<span
            slot="supporting-text"
            style=${styleMap({
              fontFamily: "var(--code-font-family, monospace)",
              fontSize: "11px",
            })}
            >${item.entity_id}</span
          >`
        : nothing}
      ${item.translated_domain && !item.show_entity_id
        ? html`<div
            slot="trailing-supporting-text"
            style=${styleMap({
              fontSize: "12px",
              fontWeight: "400",
              lineHeight: "18px",
              alignSelf: "flex-end",
              maxWidth: "30%",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            })}
          >
            ${item.translated_domain}
          </div>`
        : nothing}
    </ha-combo-box-item>
  `;

  private _getItems = memoizeOne(
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
    ): EntityPickerItem[] => {
      let states: EntityPickerItem[] = [];

      if (!hass) {
        return [];
      }
      let entityIds = Object.keys(hass.states);

      const createItems = createDomains?.length
        ? createDomains.map((domain) => {
            const primary = hass.localize(
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
              ...FAKE_ENTITY,
              entity_id: CREATE_ID + domain,
              primary: primary,
              label: primary,
              secondary: this.hass.localize(
                "ui.components.entity.entity-picker.new_entity"
              ),
              icon_path: mdiPlus,
            };
          })
        : [];

      if (!entityIds.length) {
        return [
          {
            ...FAKE_ENTITY,
            primary: this.hass!.localize(
              "ui.components.entity.entity-picker.no_entities"
            ),
            label: this.hass!.localize(
              "ui.components.entity.entity-picker.no_entities"
            ),
            icon_path: mdiMagnify,
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

      const isRTL = computeRTL(this.hass);

      states = entityIds
        .map<EntityPickerItem>((entityId) => {
          const stateObj = hass!.states[entityId];

          const { area, device } = getEntityContext(stateObj, hass);

          const friendlyName = computeStateName(stateObj); // Keep this for search
          const entityName = computeEntityName(stateObj, hass);
          const deviceName = device ? computeDeviceName(device) : undefined;
          const areaName = area ? computeAreaName(area) : undefined;

          const primary = entityName || deviceName || entityId;
          const secondary = [areaName, entityName ? deviceName : undefined]
            .filter(Boolean)
            .join(isRTL ? " ◂ " : " ▸ ");

          const translatedDomain = domainToName(
            this.hass.localize,
            computeDomain(entityId)
          );

          return {
            ...hass!.states[entityId],
            primary: primary,
            secondary:
              secondary ||
              this.hass.localize("ui.components.device-picker.no_area"),
            label: friendlyName,
            translated_domain: translatedDomain,
            sorting_label: [deviceName, entityName].filter(Boolean).join("-"),
            entity_name: entityName || deviceName,
            area_name: areaName,
            device_name: deviceName,
            friendly_name: friendlyName,
            show_entity_id: hass.userData?.showEntityIdPicker,
          };
        })
        .sort((entityA, entityB) =>
          caseInsensitiveStringCompare(
            entityA.sorting_label!,
            entityB.sorting_label!,
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
            ...FAKE_ENTITY,
            primary: this.hass!.localize(
              "ui.components.entity.entity-picker.no_match"
            ),
            label: this.hass!.localize(
              "ui.components.entity.entity-picker.no_match"
            ),
            icon_path: mdiMagnify,
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
    if (!this._initialItems || (changedProps.has("_opened") && this._opened)) {
      this.items = this._getItems(
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
      if (this._initialItems) {
        this.comboBox.filteredItems = this.items;
      }
      this._initialItems = true;
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
        .filteredItems=${this.items}
        .renderer=${this._rowRenderer}
        .required=${this.required}
        .disabled=${this.disabled}
        .hideClearIcon=${this.hideClearIcon}
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

  private _fuseKeys = [
    "entity_name",
    "device_name",
    "area_name",
    "translated_domain",
    "friendly_name", // for backwards compatibility
    "entity_id", // for technical search
  ];

  private _fuseIndex = memoizeOne((states: EntityPickerItem[]) =>
    Fuse.createIndex(this._fuseKeys, states)
  );

  private _filterChanged(ev: CustomEvent): void {
    const target = ev.target as HaComboBox;
    const filterString = ev.detail.value.trim().toLowerCase() as string;

    const minLength = 2;

    const searchTerms = (filterString.split(" ") ?? []).filter(
      (term) => term.length >= minLength
    );

    if (searchTerms.length > 0) {
      const index = this._fuseIndex(this.items);

      const options: IFuseOptions<EntityPickerItem> = {
        isCaseSensitive: false,
        threshold: 0.3,
        ignoreDiacritics: true,
        minMatchCharLength: minLength,
      };

      const fuse = new Fuse(this.items, options, index);
      const results = fuse.search({
        $and: searchTerms.map((term) => ({
          $or: this._fuseKeys.map((key) => ({ [key]: term })),
        })),
      });
      target.filteredItems = results.map((result) => result.item);
    } else {
      target.filteredItems = this.items;
    }
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
