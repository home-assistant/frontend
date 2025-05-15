import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import type { ScorableTextItem } from "../common/string/filter/sequence-matching";
import { fuzzyFilterSort } from "../common/string/filter/sequence-matching";
import type {
  DeviceEntityDisplayLookup,
  DeviceRegistryEntry,
} from "../data/device_registry";
import { getDeviceEntityDisplayLookup } from "../data/device_registry";
import type { EntityRegistryDisplayEntry } from "../data/entity_registry";
import type { LabelRegistryEntry } from "../data/label_registry";
import {
  createLabelRegistryEntry,
  subscribeLabelRegistry,
} from "../data/label_registry";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { showLabelDetailDialog } from "../panels/config/labels/show-dialog-label-detail";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-combo-box";
import type { HaComboBox } from "./ha-combo-box";
import "./ha-combo-box-item";
import "./ha-icon-button";
import "./ha-svg-icon";

type ScorableLabelItem = ScorableTextItem & LabelRegistryEntry;

const ADD_NEW_ID = "___ADD_NEW___";
const NO_LABELS_ID = "___NO_LABELS___";
const ADD_NEW_SUGGESTION_ID = "___ADD_NEW_SUGGESTION___";

const rowRenderer: ComboBoxLitRenderer<LabelRegistryEntry> = (item) => html`
  <ha-combo-box-item type="button">
    ${item.icon
      ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
      : nothing}
    ${item.name}
  </ha-combo-box-item>
`;

@customElement("ha-label-picker")
export class HaLabelPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean, attribute: "no-add" })
  public noAdd = false;

  /**
   * Show only labels with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no labels with entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only labels with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  /**
   * List of labels to be excluded.
   * @type {Array}
   * @attr exclude-labels
   */
  @property({ type: Array, attribute: "exclude-label" })
  public excludeLabels?: string[];

  @property({ attribute: false })
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: (entity: HassEntity) => boolean;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() private _opened?: boolean;

  @state() private _labels?: LabelRegistryEntry[];

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

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeLabelRegistry(this.hass.connection, (labels) => {
        this._labels = labels;
      }),
    ];
  }

  private _getLabels = memoizeOne(
    (
      labels: LabelRegistryEntry[],
      areas: HomeAssistant["areas"],
      devices: DeviceRegistryEntry[],
      entities: EntityRegistryDisplayEntry[],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      includeDeviceClasses: this["includeDeviceClasses"],
      deviceFilter: this["deviceFilter"],
      entityFilter: this["entityFilter"],
      noAdd: this["noAdd"],
      excludeLabels: this["excludeLabels"]
    ): LabelRegistryEntry[] => {
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
        inputEntities = entities.filter((entity) => entity.labels.length > 0);

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

      let outputLabels = labels;
      const usedLabels = new Set<string>();

      let areaIds: string[] | undefined;

      if (inputDevices) {
        areaIds = inputDevices
          .filter((device) => device.area_id)
          .map((device) => device.area_id!);

        inputDevices.forEach((device) => {
          device.labels.forEach((label) => usedLabels.add(label));
        });
      }

      if (inputEntities) {
        areaIds = (areaIds ?? []).concat(
          inputEntities
            .filter((entity) => entity.area_id)
            .map((entity) => entity.area_id!)
        );
        inputEntities.forEach((entity) => {
          entity.labels.forEach((label) => usedLabels.add(label));
        });
      }

      if (areaIds) {
        areaIds.forEach((areaId) => {
          const area = areas[areaId];
          area.labels.forEach((label) => usedLabels.add(label));
        });
      }

      if (excludeLabels) {
        outputLabels = outputLabels.filter(
          (label) => !excludeLabels!.includes(label.label_id)
        );
      }

      if (inputDevices || inputEntities) {
        outputLabels = outputLabels.filter((label) =>
          usedLabels.has(label.label_id)
        );
      }

      if (!outputLabels.length) {
        outputLabels = [
          {
            label_id: NO_LABELS_ID,
            name: this.hass.localize("ui.components.label-picker.no_match"),
            icon: null,
            color: null,
            description: null,
            created_at: 0,
            modified_at: 0,
          },
        ];
      }

      return noAdd
        ? outputLabels
        : [
            ...outputLabels,
            {
              label_id: ADD_NEW_ID,
              name: this.hass.localize("ui.components.label-picker.add_new"),
              icon: "mdi:plus",
              color: null,
              description: null,
              created_at: 0,
              modified_at: 0,
            },
          ];
    }
  );

  protected updated(changedProps: PropertyValues) {
    if (
      (!this._init && this.hass && this._labels) ||
      (this._init && changedProps.has("_opened") && this._opened)
    ) {
      this._init = true;
      const items = this._getLabels(
        this._labels!,
        this.hass.areas,
        Object.values(this.hass.devices),
        Object.values(this.hass.entities),
        this.includeDomains,
        this.excludeDomains,
        this.includeDeviceClasses,
        this.deviceFilter,
        this.entityFilter,
        this.noAdd,
        this.excludeLabels
      ).map((label) => ({
        ...label,
        strings: [label.label_id, label.name],
      }));

      this.comboBox.items = items;
      this.comboBox.filteredItems = items;
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .helper=${this.helper}
        item-value-path="label_id"
        item-id-path="label_id"
        item-label-path="name"
        .value=${this._value}
        .disabled=${this.disabled}
        .required=${this.required}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.label-picker.label")
          : this.label}
        .placeholder=${this.placeholder
          ? this._labels?.find((label) => label.label_id === this.placeholder)
              ?.name
          : undefined}
        .renderer=${rowRenderer}
        @filter-changed=${this._filterChanged}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._labelChanged}
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

    const filteredItems = fuzzyFilterSort<ScorableLabelItem>(
      filterString,
      target.items?.filter(
        (item) => ![NO_LABELS_ID, ADD_NEW_ID].includes(item.label_id)
      ) || []
    );
    if (filteredItems.length === 0) {
      if (this.noAdd) {
        this.comboBox.filteredItems = [
          {
            label_id: NO_LABELS_ID,
            name: this.hass.localize("ui.components.label-picker.no_match"),
            icon: null,
            color: null,
          },
        ] as ScorableLabelItem[];
      } else {
        this._suggestion = filterString;
        this.comboBox.filteredItems = [
          {
            label_id: ADD_NEW_SUGGESTION_ID,
            name: this.hass.localize(
              "ui.components.label-picker.add_new_sugestion",
              { name: this._suggestion }
            ),
            icon: "mdi:plus",
            color: null,
          },
        ] as ScorableLabelItem[];
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

  private _labelChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    let newValue = ev.detail.value;

    if (newValue === NO_LABELS_ID) {
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

    showLabelDetailDialog(this, {
      entry: undefined,
      suggestedName: newValue === ADD_NEW_SUGGESTION_ID ? this._suggestion : "",
      createEntry: async (values) => {
        const label = await createLabelRegistryEntry(this.hass, values);
        const labels = [...this._labels!, label];
        this.comboBox.filteredItems = this._getLabels(
          labels,
          this.hass.areas!,
          Object.values(this.hass.devices)!,
          Object.values(this.hass.entities)!,
          this.includeDomains,
          this.excludeDomains,
          this.includeDeviceClasses,
          this.deviceFilter,
          this.entityFilter,
          this.noAdd,
          this.excludeLabels
        );
        await this.updateComplete;
        await this.comboBox.updateComplete;
        this._setValue(label.label_id);
        return label;
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
    "ha-label-picker": HaLabelPicker;
  }
}
