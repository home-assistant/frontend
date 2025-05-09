import { mdiMagnify, mdiPlus } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import Fuse from "fuse.js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeEntityName } from "../../common/entity/compute_entity_name";
import { computeStateName } from "../../common/entity/compute_state_name";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import { isValidEntityId } from "../../common/entity/valid_entity_id";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import { computeRTL } from "../../common/util/compute_rtl";
import { domainToName } from "../../data/integration";
import type { HelperDomain } from "../../panels/config/helpers/const";
import { isHelperDomain } from "../../panels/config/helpers/const";
import { showHelperDetailDialog } from "../../panels/config/helpers/show-dialog-helper-detail";
import { HaFuse } from "../../resources/fuse";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-combo-box-item";
import "../ha-icon-button";
import "../ha-svg-icon";
import "./state-badge";

interface EntityComboBoxItem {
  // Force empty label to always display empty value by default in the search field
  id: string;
  label: "";
  primary: string;
  secondary?: string;
  domain_name?: string;
  search_labels?: string[];
  sorting_label?: string;
  icon_path?: string;
  stateObj?: HassEntity;
}

export type HaEntityComboBoxEntityFilterFunc = (entity: HassEntity) => boolean;

const CREATE_ID = "___create-new-entity___";
const NO_ENTITIES_ID = "___no-entities___";

@customElement("ha-entity-combo-box")
export class HaEntityComboBox extends LitElement {
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
  public entityFilter?: HaEntityComboBoxEntityFilterFunc;

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

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

  private _items: EntityComboBoxItem[] = [];

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.hass.loadBackendTranslation("title");
  }

  private _rowRenderer: ComboBoxLitRenderer<EntityComboBoxItem> = (
    item,
    { index }
  ) => {
    const showEntityId = this.hass.userData?.showEntityIdPicker;

    return html`
      <ha-combo-box-item type="button" compact .borderTop=${index !== 0}>
        ${item.icon_path
          ? html`
              <ha-svg-icon slot="start" .path=${item.icon_path}></ha-svg-icon>
            `
          : html`
              <state-badge
                slot="start"
                .stateObj=${item.stateObj}
                .hass=${this.hass}
              ></state-badge>
            `}
        <span slot="headline">${item.primary}</span>
        ${item.secondary
          ? html`<span slot="supporting-text">${item.secondary}</span>`
          : nothing}
        ${item.stateObj && showEntityId
          ? html`
              <span slot="supporting-text" class="code">
                ${item.stateObj.entity_id}
              </span>
            `
          : nothing}
        ${item.domain_name && !showEntityId
          ? html`
              <div slot="trailing-supporting-text" class="domain">
                ${item.domain_name}
              </div>
            `
          : nothing}
      </ha-combo-box-item>
    `;
  };

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
    ): EntityComboBoxItem[] => {
      let items: EntityComboBoxItem[] = [];

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
              id: CREATE_ID + domain,
              label: "",
              primary: primary,
              secondary: this.hass.localize(
                "ui.components.entity.entity-picker.new_entity"
              ),
              icon_path: mdiPlus,
            } satisfies EntityComboBoxItem;
          })
        : [];

      if (!entityIds.length) {
        return [
          {
            id: NO_ENTITIES_ID,
            label: "",
            primary: this.hass!.localize(
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

      items = entityIds
        .map<EntityComboBoxItem>((entityId) => {
          const stateObj = hass!.states[entityId];

          const { area, device } = getEntityContext(stateObj, hass);

          const friendlyName = computeStateName(stateObj); // Keep this for search
          const entityName = computeEntityName(stateObj, hass);
          const deviceName = device ? computeDeviceName(device) : undefined;
          const areaName = area ? computeAreaName(area) : undefined;

          const domainName = domainToName(
            this.hass.localize,
            computeDomain(entityId)
          );

          const primary = entityName || deviceName || entityId;
          const secondary = [areaName, entityName ? deviceName : undefined]
            .filter(Boolean)
            .join(isRTL ? " ◂ " : " ▸ ");

          return {
            id: entityId,
            label: "",
            primary: primary,
            secondary: secondary,
            domain_name: domainName,
            sorting_label: [deviceName, entityName].filter(Boolean).join("_"),
            search_labels: [
              entityName,
              deviceName,
              areaName,
              domainName,
              friendlyName,
              entityId,
            ].filter(Boolean) as string[],
            stateObj: stateObj,
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
        items = items.filter(
          (item) =>
            // We always want to include the entity of the current value
            item.id === this.value ||
            (item.stateObj?.attributes.device_class &&
              includeDeviceClasses.includes(
                item.stateObj.attributes.device_class
              ))
        );
      }

      if (includeUnitOfMeasurement) {
        items = items.filter(
          (item) =>
            // We always want to include the entity of the current value
            item.id === this.value ||
            (item.stateObj?.attributes.unit_of_measurement &&
              includeUnitOfMeasurement.includes(
                item.stateObj.attributes.unit_of_measurement
              ))
        );
      }

      if (entityFilter) {
        items = items.filter(
          (item) =>
            // We always want to include the entity of the current value
            item.id === this.value ||
            (item.stateObj && entityFilter!(item.stateObj))
        );
      }

      if (!items.length) {
        return [
          {
            id: NO_ENTITIES_ID,
            label: "",
            primary: this.hass!.localize(
              "ui.components.entity.entity-picker.no_match"
            ),
            icon_path: mdiMagnify,
          },
          ...createItems,
        ];
      }

      if (createItems?.length) {
        items.push(...createItems);
      }

      return items;
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
      this._items = this._getItems(
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
        this.comboBox.filteredItems = this._items;
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
        item-value-path="id"
        .hass=${this.hass}
        .value=${this._value}
        .label=${this.label === undefined
          ? this.hass.localize("ui.components.entity.entity-picker.entity")
          : this.label}
        .helper=${this.helper}
        .allowCustomValue=${this.allowCustomEntity}
        .filteredItems=${this._items}
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
    // Clear the input field to prevent showing the old value next time
    this.comboBox.setTextFieldValue("");
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

  private _fuseIndex = memoizeOne((states: EntityComboBoxItem[]) =>
    Fuse.createIndex(["search_labels"], states)
  );

  private _filterChanged(ev: CustomEvent): void {
    if (!this._opened) return;

    const target = ev.target as HaComboBox;
    const filterString = ev.detail.value.trim().toLowerCase() as string;

    const index = this._fuseIndex(this._items);
    const fuse = new HaFuse(this._items, {}, index);

    const results = fuse.multiTermsSearch(filterString);
    if (results) {
      if (results.length === 0) {
        target.filteredItems = [
          {
            id: NO_ENTITIES_ID,
            label: "",
            primary: this.hass!.localize(
              "ui.components.entity.entity-picker.no_match"
            ),
            icon_path: mdiMagnify,
          },
        ] as EntityComboBoxItem[];
      } else {
        target.filteredItems = results.map((result) => result.item);
      }
    } else {
      target.filteredItems = this._items;
    }
  }

  private _setValue(value: string | undefined) {
    if (!value || !isValidEntityId(value)) {
      return;
    }
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-combo-box": HaEntityComboBox;
  }
}
