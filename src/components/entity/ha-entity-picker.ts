import { mdiPlus, mdiShape } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { isValidEntityId } from "../../common/entity/valid_entity_id";
import { computeRTL } from "../../common/util/compute_rtl";
import { domainToName } from "../../data/integration";
import {
  isHelperDomain,
  type HelperDomain,
} from "../../panels/config/helpers/const";
import { showHelperDetailDialog } from "../../panels/config/helpers/show-dialog-helper-detail";
import type { HomeAssistant } from "../../types";
import "../ha-combo-box-item";
import "../ha-generic-picker";
import type { HaGenericPicker } from "../ha-generic-picker";
import type {
  PickerComboBoxItem,
  PickerComboBoxSearchFn,
} from "../ha-picker-combo-box";
import type { PickerValueRenderer } from "../ha-picker-field";
import "../ha-svg-icon";
import "./state-badge";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity";

interface EntityComboBoxItem extends PickerComboBoxItem {
  domain_name?: string;
  stateObj?: HassEntity;
}

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

  @property({ type: Boolean, attribute: "show-entity-id" })
  public showEntityId = false;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: String, attribute: "search-label" })
  public searchLabel?: string;

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

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    // Load title translations so it is available when the combo-box opens
    this.hass.loadBackendTranslation("title");
  }

  private _valueRenderer: PickerValueRenderer = (value) => {
    const entityId = value || "";

    const stateObj = this.hass.states[entityId];

    if (!stateObj) {
      return html`
        <ha-svg-icon
          slot="start"
          .path=${mdiShape}
          style="margin: 0 4px"
        ></ha-svg-icon>
        <span slot="headline">${entityId}</span>
      `;
    }

    const entityName = this.hass.formatEntityName(stateObj, "entity");
    const deviceName = this.hass.formatEntityName(stateObj, "device");
    const areaName = this.hass.formatEntityName(stateObj, "area");

    const isRTL = computeRTL(this.hass);

    const primary = entityName || deviceName || entityId;
    const secondary = [areaName, entityName ? deviceName : undefined]
      .filter(Boolean)
      .join(isRTL ? " ◂ " : " ▸ ");

    return html`
      <state-badge
        .hass=${this.hass}
        .stateObj=${stateObj}
        slot="start"
      ></state-badge>
      <span slot="headline">${primary}</span>
      <span slot="supporting-text">${secondary}</span>
    `;
  };

  private get _showEntityId() {
    return this.showEntityId || this.hass.userData?.showEntityIdPicker;
  }

  private _rowRenderer: ComboBoxLitRenderer<EntityComboBoxItem> = (
    item,
    { index }
  ) => {
    const showEntityId = this._showEntityId;

    return html`
      <ha-combo-box-item type="button" compact .borderTop=${index !== 0}>
        ${item.icon_path
          ? html`
              <ha-svg-icon
                slot="start"
                style="margin: 0 4px"
                .path=${item.icon_path}
              ></ha-svg-icon>
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

  private _getAdditionalItems = () =>
    this._getCreateItems(this.hass.localize, this.createDomains);

  private _getCreateItems = memoizeOne(
    (
      localize: this["hass"]["localize"],
      createDomains: this["createDomains"]
    ) => {
      if (!createDomains?.length) {
        return [];
      }

      return createDomains.map((domain) => {
        const primary = localize(
          "ui.components.entity.entity-picker.create_helper",
          {
            domain: isHelperDomain(domain)
              ? localize(
                  `ui.panel.config.helpers.types.${domain as HelperDomain}`
                )
              : domainToName(localize, domain),
          }
        );

        return {
          id: CREATE_ID + domain,
          primary: primary,
          secondary: localize("ui.components.entity.entity-picker.new_entity"),
          icon_path: mdiPlus,
        } satisfies EntityComboBoxItem;
      });
    }
  );

  private _getItems = () =>
    this._getEntities(
      this.hass,
      this.includeDomains,
      this.excludeDomains,
      this.entityFilter,
      this.includeDeviceClasses,
      this.includeUnitOfMeasurement,
      this.includeEntities,
      this.excludeEntities
    );

  private _getEntities = memoizeOne(
    (
      hass: this["hass"],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      entityFilter: this["entityFilter"],
      includeDeviceClasses: this["includeDeviceClasses"],
      includeUnitOfMeasurement: this["includeUnitOfMeasurement"],
      includeEntities: this["includeEntities"],
      excludeEntities: this["excludeEntities"]
    ): EntityComboBoxItem[] => {
      let items: EntityComboBoxItem[] = [];

      let entityIds = Object.keys(hass.states);

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

      items = entityIds.map<EntityComboBoxItem>((entityId) => {
        const stateObj = hass!.states[entityId];

        const friendlyName = computeStateName(stateObj); // Keep this for search
        const entityName = this.hass.formatEntityName(stateObj, "entity");
        const deviceName = this.hass.formatEntityName(stateObj, "device");
        const areaName = this.hass.formatEntityName(stateObj, "area");

        const domainName = domainToName(
          this.hass.localize,
          computeDomain(entityId)
        );

        const primary = entityName || deviceName || entityId;
        const secondary = [areaName, entityName ? deviceName : undefined]
          .filter(Boolean)
          .join(isRTL ? " ◂ " : " ▸ ");
        const a11yLabel = [deviceName, entityName].filter(Boolean).join(" - ");

        return {
          id: entityId,
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
          a11y_label: a11yLabel,
          stateObj: stateObj,
        };
      });

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

      return items;
    }
  );

  protected render() {
    const placeholder =
      this.placeholder ??
      this.hass.localize("ui.components.entity.entity-picker.placeholder");
    const notFoundLabel = this.hass.localize(
      "ui.components.entity.entity-picker.no_match"
    );

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .disabled=${this.disabled}
        .autofocus=${this.autofocus}
        .allowCustomValue=${this.allowCustomEntity}
        .label=${this.label}
        .helper=${this.helper}
        .searchLabel=${this.searchLabel}
        .notFoundLabel=${notFoundLabel}
        .placeholder=${placeholder}
        .value=${this.value}
        .rowRenderer=${this._rowRenderer}
        .getItems=${this._getItems}
        .getAdditionalItems=${this._getAdditionalItems}
        .hideClearIcon=${this.hideClearIcon}
        .searchFn=${this._searchFn}
        .valueRenderer=${this._valueRenderer}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _searchFn: PickerComboBoxSearchFn<EntityComboBoxItem> = (
    search,
    filteredItems
  ) => {
    // If there is exact match for entity id, put it first
    const index = filteredItems.findIndex(
      (item) => item.stateObj?.entity_id === search
    );
    if (index === -1) {
      return filteredItems;
    }

    const [exactMatch] = filteredItems.splice(index, 1);
    filteredItems.unshift(exactMatch);
    return filteredItems;
  };

  public async open() {
    await this.updateComplete;
    await this._picker?.open();
  }

  private _valueChanged(ev) {
    ev.stopPropagation();
    const value = ev.detail.value;

    if (!value) {
      this._setValue(undefined);
      return;
    }

    if (value.startsWith(CREATE_ID)) {
      const domain = value.substring(CREATE_ID.length);

      showHelperDetailDialog(this, {
        domain,
        dialogClosedCallback: (item) => {
          if (item.entityId) this._setValue(item.entityId);
        },
      });
      return;
    }

    if (!isValidEntityId(value)) {
      return;
    }

    this._setValue(value);
  }

  private _setValue(value: string | undefined) {
    this.value = value;

    fireEvent(this, "value-changed", { value });
    fireEvent(this, "change");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-picker": HaEntityPicker;
  }
}
