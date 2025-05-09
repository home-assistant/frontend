import { mdiTextureBox } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import type { ScorableTextItem } from "../common/string/filter/sequence-matching";
import { fuzzyFilterSort } from "../common/string/filter/sequence-matching";
import type { AreaRegistryEntry } from "../data/area_registry";
import { createAreaRegistryEntry } from "../data/area_registry";
import type {
  DeviceEntityDisplayLookup,
  DeviceRegistryEntry,
} from "../data/device_registry";
import { getDeviceEntityDisplayLookup } from "../data/device_registry";
import type { EntityRegistryDisplayEntry } from "../data/entity_registry";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import { showAreaRegistryDetailDialog } from "../panels/config/areas/show-dialog-area-registry-detail";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import type { HaDeviceComboBoxDeviceFilterFunc } from "./device/ha-device-combo-box";
import "./ha-combo-box";
import type { HaComboBox } from "./ha-combo-box";
import "./ha-combo-box-item";
import "./ha-icon-button";
import "./ha-svg-icon";

type ScorableAreaRegistryEntry = ScorableTextItem & AreaRegistryEntry;

const rowRenderer: ComboBoxLitRenderer<AreaRegistryEntry> = (item) => html`
  <ha-combo-box-item type="button">
    ${item.icon
      ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
      : html`<ha-svg-icon slot="start" .path=${mdiTextureBox}></ha-svg-icon>`}
    ${item.name}
  </ha-combo-box-item>
`;

const ADD_NEW_ID = "___ADD_NEW___";
const NO_ITEMS_ID = "___NO_ITEMS___";
const ADD_NEW_SUGGESTION_ID = "___ADD_NEW_SUGGESTION___";

@customElement("ha-area-picker")
export class HaAreaPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean, attribute: "no-add" })
  public noAdd = false;

  /**
   * Show only areas with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no areas with entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only areas with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  /**
   * List of areas to be excluded.
   * @type {Array}
   * @attr exclude-areas
   */
  @property({ type: Array, attribute: "exclude-areas" })
  public excludeAreas?: string[];

  @property({ attribute: false })
  public deviceFilter?: HaDeviceComboBoxDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: (entity: HassEntity) => boolean;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() private _opened?: boolean;

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  private _suggestion?: string;

  private _init = false;

  public async open() {
    await this.updateComplete;
    await this.comboBox?.open();
  }

  public async focus() {
    await this.updateComplete;
    await this.comboBox?.focus();
  }

  private _getAreas = memoizeOne(
    (
      areas: AreaRegistryEntry[],
      devices: DeviceRegistryEntry[],
      entities: EntityRegistryDisplayEntry[],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      includeDeviceClasses: this["includeDeviceClasses"],
      deviceFilter: this["deviceFilter"],
      entityFilter: this["entityFilter"],
      noAdd: this["noAdd"],
      excludeAreas: this["excludeAreas"]
    ): AreaRegistryEntry[] => {
      let deviceEntityLookup: DeviceEntityDisplayLookup = {};
      let inputDevices: DeviceRegistryEntry[] | undefined;
      let inputEntities: EntityRegistryDisplayEntry[] | undefined;

      if (
        includeDomains ||
        excludeDomains ||
        includeDeviceClasses ||
        deviceFilter ||
        entityFilter
      ) {
        deviceEntityLookup = getDeviceEntityDisplayLookup(entities);
        inputDevices = devices;
        inputEntities = entities.filter((entity) => entity.area_id);

        if (includeDomains) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return false;
            }
            return deviceEntityLookup[device.id].some((entity) =>
              includeDomains.includes(computeDomain(entity.entity_id))
            );
          });
          inputEntities = inputEntities!.filter((entity) =>
            includeDomains.includes(computeDomain(entity.entity_id))
          );
        }

        if (excludeDomains) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return true;
            }
            return entities.every(
              (entity) =>
                !excludeDomains.includes(computeDomain(entity.entity_id))
            );
          });
          inputEntities = inputEntities!.filter(
            (entity) =>
              !excludeDomains.includes(computeDomain(entity.entity_id))
          );
        }

        if (includeDeviceClasses) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return false;
            }
            return deviceEntityLookup[device.id].some((entity) => {
              const stateObj = this.hass.states[entity.entity_id];
              if (!stateObj) {
                return false;
              }
              return (
                stateObj.attributes.device_class &&
                includeDeviceClasses.includes(stateObj.attributes.device_class)
              );
            });
          });
          inputEntities = inputEntities!.filter((entity) => {
            const stateObj = this.hass.states[entity.entity_id];
            return (
              stateObj.attributes.device_class &&
              includeDeviceClasses.includes(stateObj.attributes.device_class)
            );
          });
        }

        if (deviceFilter) {
          inputDevices = inputDevices!.filter((device) =>
            deviceFilter!(device)
          );
        }

        if (entityFilter) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return false;
            }
            return deviceEntityLookup[device.id].some((entity) => {
              const stateObj = this.hass.states[entity.entity_id];
              if (!stateObj) {
                return false;
              }
              return entityFilter(stateObj);
            });
          });
          inputEntities = inputEntities!.filter((entity) => {
            const stateObj = this.hass.states[entity.entity_id];
            if (!stateObj) {
              return false;
            }
            return entityFilter!(stateObj);
          });
        }
      }

      let outputAreas = areas;

      let areaIds: string[] | undefined;

      if (inputDevices) {
        areaIds = inputDevices
          .filter((device) => device.area_id)
          .map((device) => device.area_id!);
      }

      if (inputEntities) {
        areaIds = (areaIds ?? []).concat(
          inputEntities
            .filter((entity) => entity.area_id)
            .map((entity) => entity.area_id!)
        );
      }

      if (areaIds) {
        outputAreas = outputAreas.filter((area) =>
          areaIds!.includes(area.area_id)
        );
      }

      if (excludeAreas) {
        outputAreas = outputAreas.filter(
          (area) => !excludeAreas!.includes(area.area_id)
        );
      }

      if (!outputAreas.length) {
        outputAreas = [
          {
            area_id: NO_ITEMS_ID,
            floor_id: null,
            name: this.hass.localize("ui.components.area-picker.no_areas"),
            picture: null,
            icon: null,
            aliases: [],
            labels: [],
            temperature_entity_id: null,
            humidity_entity_id: null,
            created_at: 0,
            modified_at: 0,
          },
        ];
      }

      return noAdd
        ? outputAreas
        : [
            ...outputAreas,
            {
              area_id: ADD_NEW_ID,
              floor_id: null,
              name: this.hass.localize("ui.components.area-picker.add_new"),
              picture: null,
              icon: "mdi:plus",
              aliases: [],
              labels: [],
              temperature_entity_id: null,
              humidity_entity_id: null,
              created_at: 0,
              modified_at: 0,
            },
          ];
    }
  );

  protected updated(changedProps: PropertyValues) {
    if (
      (!this._init && this.hass) ||
      (this._init && changedProps.has("_opened") && this._opened)
    ) {
      this._init = true;
      const areas = this._getAreas(
        Object.values(this.hass.areas),
        Object.values(this.hass.devices),
        Object.values(this.hass.entities),
        this.includeDomains,
        this.excludeDomains,
        this.includeDeviceClasses,
        this.deviceFilter,
        this.entityFilter,
        this.noAdd,
        this.excludeAreas
      ).map((area) => ({
        ...area,
        strings: [area.area_id, ...area.aliases, area.name],
      }));
      this.comboBox.items = areas;
      this.comboBox.filteredItems = areas;
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .helper=${this.helper}
        item-value-path="area_id"
        item-id-path="area_id"
        item-label-path="name"
        .value=${this._value}
        .disabled=${this.disabled}
        .required=${this.required}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.area-picker.area")
          : this.label}
        .placeholder=${this.placeholder
          ? this.hass.areas[this.placeholder]?.name
          : undefined}
        .renderer=${rowRenderer}
        @filter-changed=${this._filterChanged}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._areaChanged}
      >
      </ha-combo-box>
    `;
  }

  private _filterChanged(ev: CustomEvent): void {
    const target = ev.target as HaComboBox;
    const filterString = ev.detail.value;
    if (!filterString) {
      this.comboBox.filteredItems = this.comboBox.items;
      return;
    }

    const filteredItems = fuzzyFilterSort<ScorableAreaRegistryEntry>(
      filterString,
      target.items?.filter(
        (item) => ![NO_ITEMS_ID, ADD_NEW_ID].includes(item.label_id)
      ) || []
    );
    if (filteredItems.length === 0) {
      if (this.noAdd) {
        this.comboBox.filteredItems = [
          {
            area_id: NO_ITEMS_ID,
            floor_id: null,
            name: this.hass.localize("ui.components.area-picker.no_match"),
            icon: null,
            picture: null,
            labels: [],
            aliases: [],
            temperature_entity_id: null,
            humidity_entity_id: null,
            created_at: 0,
            modified_at: 0,
          },
        ] as AreaRegistryEntry[];
      } else {
        this._suggestion = filterString;
        this.comboBox.filteredItems = [
          {
            area_id: ADD_NEW_SUGGESTION_ID,
            floor_id: null,
            name: this.hass.localize(
              "ui.components.area-picker.add_new_sugestion",
              { name: this._suggestion }
            ),
            icon: "mdi:plus",
            picture: null,
            labels: [],
            aliases: [],
            temperature_entity_id: null,
            humidity_entity_id: null,
            created_at: 0,
            modified_at: 0,
          },
        ] as AreaRegistryEntry[];
      }
    } else {
      this.comboBox.filteredItems = filteredItems;
    }
  }

  private get _value() {
    return this.value || "";
  }

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _areaChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    let newValue = ev.detail.value;

    if (newValue === NO_ITEMS_ID) {
      newValue = "";
      this.comboBox.setInputValue("");
      return;
    }

    if (![ADD_NEW_SUGGESTION_ID, ADD_NEW_ID].includes(newValue)) {
      if (newValue !== this._value) {
        this._setValue(newValue);
      }
      return;
    }

    (ev.target as any).value = this._value;

    this.hass.loadFragmentTranslation("config");

    showAreaRegistryDetailDialog(this, {
      suggestedName: newValue === ADD_NEW_SUGGESTION_ID ? this._suggestion : "",
      createEntry: async (values) => {
        try {
          const area = await createAreaRegistryEntry(this.hass, values);
          const areas = [...Object.values(this.hass.areas), area];
          this.comboBox.filteredItems = this._getAreas(
            areas,
            Object.values(this.hass.devices)!,
            Object.values(this.hass.entities)!,
            this.includeDomains,
            this.excludeDomains,
            this.includeDeviceClasses,
            this.deviceFilter,
            this.entityFilter,
            this.noAdd,
            this.excludeAreas
          );
          await this.updateComplete;
          await this.comboBox.updateComplete;
          this._setValue(area.area_id);
        } catch (err: any) {
          showAlertDialog(this, {
            title: this.hass.localize(
              "ui.components.area-picker.failed_create_area"
            ),
            text: err.message,
          });
        }
      },
    });

    this._suggestion = undefined;
    this.comboBox.setInputValue("");
  }

  private _setValue(value?: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-picker": HaAreaPicker;
  }
}
