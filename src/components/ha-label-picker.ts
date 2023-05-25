import "@material/mwc-list/mwc-list-item";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import {
  LabelRegistryEntry,
  createLabelRegistryEntry,
} from "../data/label_registry";
import {
  DeviceEntityDisplayLookup,
  DeviceRegistryEntry,
  getDeviceEntityDisplayLookup,
} from "../data/device_registry";
import { EntityRegistryDisplayEntry } from "../data/entity_registry";
import {
  showAlertDialog,
  showPromptDialog,
} from "../dialogs/generic/show-dialog-box";
import { ValueChangedEvent, HomeAssistant } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-combo-box";
import type { HaComboBox } from "./ha-combo-box";
import "./ha-icon-button";
import "./ha-svg-icon";

const rowRenderer: ComboBoxLitRenderer<LabelRegistryEntry> = (
  item
) => html`<mwc-list-item
  class=${classMap({ "add-new": item.label_id === "add_new" })}
>
  ${item.name}
</mwc-list-item>`;

@customElement("ha-label-picker")
export class HaLabelPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean, attribute: "no-add" })
  public noAdd?: boolean;

  /**
   * Show only labels with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no label with entities of these domains.
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
  @property({ type: Array, attribute: "exclude-labels" })
  public excludeLabels?: string[];

  @property() public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property() public entityFilter?: (entity: HassEntity) => boolean;

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean }) public required?: boolean;

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

  private _getLabels = memoizeOne(
    (
      labels: LabelRegistryEntry[],
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
      if (!labels.length) {
        return [
          {
            label_id: "no_labels",
            name: this.hass.localize("ui.components.label-picker.no_labels"),
            icon: null,
            color: "#CCCCCC",
            description: null,
          },
        ];
      }

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
        inputEntities = entities.filter((entity) => entity.labels);

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

      let labelIds: string[] | undefined;

      if (inputDevices) {
        labelIds = inputDevices
          .filter((device) => device.labels)
          .map((device) => device.labels!)
          .flat(1);
      }

      if (inputEntities) {
        labelIds = (labelIds ?? []).concat(
          inputEntities
            .filter((entity) => entity.labels)
            .map((entity) => entity.labels!)
            .flat(1)
        );
      }

      if (labelIds) {
        outputLabels = labels.filter((label) =>
          labelIds!.includes(label.label_id)
        );
      }

      if (excludeLabels) {
        outputLabels = outputLabels.filter(
          (label) => !excludeLabels!.includes(label.label_id)
        );
      }

      if (!outputLabels.length) {
        outputLabels = [
          {
            label_id: "no_labels",
            name: this.hass.localize("ui.components.label-picker.no_match"),
            icon: null,
            description: null,
            color: "#CCCCCC",
          },
        ];
      }

      return noAdd
        ? outputLabels
        : [
            ...outputLabels,
            {
              label_id: "add_new",
              name: this.hass.localize("ui.components.label-picker.add_new"),
              icon: null,
              description: null,
              color: "#CCCCCC",
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
      const labels = this._getLabels(
        Object.values(this.hass.labels),
        Object.values(this.hass.devices),
        Object.values(this.hass.entities),
        this.includeDomains,
        this.excludeDomains,
        this.includeDeviceClasses,
        this.deviceFilter,
        this.entityFilter,
        this.noAdd,
        this.excludeLabels
      );
      (this.comboBox as any).items = labels;
      (this.comboBox as any).filteredItems = labels;
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
        .value=${this.value}
        .disabled=${this.disabled}
        .required=${this.required}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.label-picker.label")
          : this.label}
        .placeholder=${this.placeholder
          ? this.hass.labels[this.placeholder]?.name
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
    const filter = ev.detail.value;
    if (!filter) {
      this.comboBox.filteredItems = this.comboBox.items;
      return;
    }

    const filteredItems = this.comboBox.items?.filter((item) =>
      item.name.toLowerCase().includes(filter!.toLowerCase())
    );
    if (!this.noAdd && filteredItems?.length === 0) {
      this._suggestion = filter;
      this.comboBox.filteredItems = [
        {
          label_id: "add_new_suggestion",
          name: this.hass.localize(
            "ui.components.label-picker.add_new_sugestion",
            { name: this._suggestion }
          ),
          icon: null,
          description: null,
          color: null,
        },
      ];
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

    if (newValue === "no_labels") {
      newValue = "";
    }

    if (!["add_new_suggestion", "add_new"].includes(newValue)) {
      if (newValue !== this._value) {
        this._setValue(newValue);
      }
      return;
    }

    (ev.target as any).value = this._value;
    showPromptDialog(this, {
      title: this.hass.localize("ui.components.label-picker.add_dialog.title"),
      text: this.hass.localize("ui.components.label-picker.add_dialog.text"),
      confirmText: this.hass.localize(
        "ui.components.label-picker.add_dialog.add"
      ),
      inputLabel: this.hass.localize(
        "ui.components.label-picker.add_dialog.name"
      ),
      defaultValue:
        newValue === "add_new_suggestion" ? this._suggestion : undefined,
      confirm: async (name) => {
        if (!name) {
          return;
        }
        try {
          const label = await createLabelRegistryEntry(this.hass, {
            name,
          });
          const labels = [...Object.values(this.hass.labels), label];
          (this.comboBox as any).filteredItems = this._getLabels(
            labels,
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
        } catch (err: any) {
          showAlertDialog(this, {
            title: this.hass.localize(
              "ui.components.label-picker.add_dialog.failed_create_label"
            ),
            text: err.message,
          });
        }
      },
      cancel: () => {
        this._setValue(undefined);
        this._suggestion = undefined;
      },
    });
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
