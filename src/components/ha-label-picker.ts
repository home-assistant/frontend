import { mdiLabel, mdiPlus } from "@mdi/js";
import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
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
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { showLabelDetailDialog } from "../panels/config/labels/show-dialog-label-detail";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import type { PickerValueRenderer } from "./ha-picker-field";
import "./ha-svg-icon";

const ADD_NEW_ID = "___ADD_NEW___";
const NO_LABELS = "___NO_LABELS___";

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

  @state() private _labels?: LabelRegistryEntry[];

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  public async open() {
    await this.updateComplete;
    await this._picker?.open();
  }

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeLabelRegistry(this.hass.connection, (labels) => {
        this._labels = labels;
      }),
    ];
  }

  private _labelMap = memoizeOne(
    (
      labels: LabelRegistryEntry[] | undefined
    ): Map<string, LabelRegistryEntry> => {
      if (!labels) {
        return new Map();
      }
      return new Map(labels.map((label) => [label.label_id, label]));
    }
  );

  private _computeValueRenderer = memoizeOne(
    (labels: LabelRegistryEntry[] | undefined): PickerValueRenderer =>
      (value) => {
        const label = this._labelMap(labels).get(value);

        if (!label) {
          return html`
            <ha-svg-icon slot="start" .path=${mdiLabel}></ha-svg-icon>
            <span slot="headline">${value}</span>
          `;
        }

        return html`
          ${label.icon
            ? html`<ha-icon slot="start" .icon=${label.icon}></ha-icon>`
            : html`<ha-svg-icon slot="start" .path=${mdiLabel}></ha-svg-icon>`}
          <span slot="headline">${label.name}</span>
        `;
      }
  );

  private _getLabels = memoizeOne(
    (
      labels: LabelRegistryEntry[] | undefined,
      haAreas: HomeAssistant["areas"],
      haDevices: HomeAssistant["devices"],
      haEntities: HomeAssistant["entities"],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      includeDeviceClasses: this["includeDeviceClasses"],
      deviceFilter: this["deviceFilter"],
      entityFilter: this["entityFilter"],
      excludeLabels: this["excludeLabels"]
    ): PickerComboBoxItem[] => {
      if (!labels || labels.length === 0) {
        return [
          {
            id: NO_LABELS,
            primary: this.hass.localize("ui.components.label-picker.no_labels"),
            icon_path: mdiLabel,
          },
        ];
      }

      const devices = Object.values(haDevices);
      const entities = Object.values(haEntities);

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
          const area = haAreas[areaId];
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

      const items = outputLabels.map<PickerComboBoxItem>((label) => ({
        id: label.label_id,
        primary: label.name,
        icon: label.icon || undefined,
        icon_path: label.icon ? undefined : mdiLabel,
        sorting_label: label.name,
        search_labels: [label.name, label.label_id, label.description].filter(
          (v): v is string => Boolean(v)
        ),
      }));

      return items;
    }
  );

  private _getItems = () =>
    this._getLabels(
      this._labels,
      this.hass.areas,
      this.hass.devices,
      this.hass.entities,
      this.includeDomains,
      this.excludeDomains,
      this.includeDeviceClasses,
      this.deviceFilter,
      this.entityFilter,
      this.excludeLabels
    );

  private _allLabelNames = memoizeOne((labels?: LabelRegistryEntry[]) => {
    if (!labels) {
      return [];
    }
    return [
      ...new Set(
        labels
          .map((label) => label.name.toLowerCase())
          .filter(Boolean) as string[]
      ),
    ];
  });

  private _getAdditionalItems = (
    searchString?: string
  ): PickerComboBoxItem[] => {
    if (this.noAdd) {
      return [];
    }

    const allLabelNames = this._allLabelNames(this._labels);

    if (searchString && !allLabelNames.includes(searchString.toLowerCase())) {
      return [
        {
          id: ADD_NEW_ID + searchString,
          primary: this.hass.localize(
            "ui.components.label-picker.add_new_sugestion",
            {
              name: searchString,
            }
          ),
          icon_path: mdiPlus,
        },
      ];
    }

    return [
      {
        id: ADD_NEW_ID,
        primary: this.hass.localize("ui.components.label-picker.add_new"),
        icon_path: mdiPlus,
      },
    ];
  };

  protected render(): TemplateResult {
    const placeholder =
      this.placeholder ??
      this.hass.localize("ui.components.label-picker.label");

    const valueRenderer = this._computeValueRenderer(this._labels);

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        .label=${this.label}
        .notFoundLabel=${this.hass.localize(
          "ui.components.label-picker.no_match"
        )}
        .placeholder=${placeholder}
        .value=${this.value}
        .getItems=${this._getItems}
        .getAdditionalItems=${this._getAdditionalItems}
        .valueRenderer=${valueRenderer}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();

    const value = ev.detail.value;

    if (value === NO_LABELS) {
      return;
    }

    if (!value) {
      this._setValue(undefined);
      return;
    }

    if (value.startsWith(ADD_NEW_ID)) {
      this.hass.loadFragmentTranslation("config");

      const suggestedName = value.substring(ADD_NEW_ID.length);

      showLabelDetailDialog(this, {
        suggestedName: suggestedName,
        createEntry: async (values) => {
          try {
            const label = await createLabelRegistryEntry(this.hass, values);
            this._setValue(label.label_id);
          } catch (err: any) {
            showAlertDialog(this, {
              title: this.hass.localize(
                "ui.components.label-picker.failed_create_label"
              ),
              text: err.message,
            });
          }
        },
      });
      return;
    }

    this._setValue(value);
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
