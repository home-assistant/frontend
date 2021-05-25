import "@material/mwc-icon-button/mwc-icon-button";
import { mdiClose, mdiMenuDown, mdiMenuUp } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-listbox/paper-listbox";
import "@vaadin/vaadin-combo-box/theme/material/vaadin-combo-box-light";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { ComboBoxLitRenderer, comboBoxRenderer } from "lit-vaadin-helpers";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import {
  AreaRegistryEntry,
  createAreaRegistryEntry,
  subscribeAreaRegistry,
} from "../data/area_registry";
import {
  DeviceEntityLookup,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../data/entity_registry";
import {
  showAlertDialog,
  showPromptDialog,
} from "../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { PolymerChangedEvent } from "../polymer-types";
import { HomeAssistant } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-svg-icon";

const rowRenderer: ComboBoxLitRenderer<AreaRegistryEntry> = (
  item
) => html`<style>
    paper-item {
      margin: -10px 0;
      padding: 0;
    }
    paper-item.add-new {
      font-weight: 500;
    }
  </style>
  <paper-item class=${classMap({ "add-new": item.area_id === "add_new" })}>
    <paper-item-body two-line>${item.name}</paper-item-body>
  </paper-item>`;

@customElement("ha-area-picker")
export class HaAreaPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean, attribute: "no-add" })
  public noAdd?: boolean;

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

  @property() public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property() public entityFilter?: (entity: EntityRegistryEntry) => boolean;

  @property({ type: Boolean }) public disabled?: boolean;

  @state() private _areas?: AreaRegistryEntry[];

  @state() private _devices?: DeviceRegistryEntry[];

  @state() private _entities?: EntityRegistryEntry[];

  @state() private _opened?: boolean;

  @query("vaadin-combo-box-light", true) public comboBox!: HTMLElement;

  private _init = false;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeAreaRegistry(this.hass.connection!, (areas) => {
        this._areas = areas;
      }),
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this._devices = devices;
      }),
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities;
      }),
    ];
  }

  public open() {
    this.updateComplete.then(() => {
      (this.shadowRoot?.querySelector("vaadin-combo-box-light") as any)?.open();
    });
  }

  public focus() {
    this.updateComplete.then(() => {
      this.shadowRoot?.querySelector("paper-input")?.focus();
    });
  }

  private _getAreas = memoizeOne(
    (
      areas: AreaRegistryEntry[],
      devices: DeviceRegistryEntry[],
      entities: EntityRegistryEntry[],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      includeDeviceClasses: this["includeDeviceClasses"],
      deviceFilter: this["deviceFilter"],
      entityFilter: this["entityFilter"],
      noAdd: this["noAdd"]
    ): AreaRegistryEntry[] => {
      if (!areas.length) {
        return [
          {
            area_id: "",
            name: this.hass.localize("ui.components.area-picker.no_areas"),
          },
        ];
      }

      const deviceEntityLookup: DeviceEntityLookup = {};
      let inputDevices: DeviceRegistryEntry[] | undefined;
      let inputEntities: EntityRegistryEntry[] | undefined;

      if (includeDomains || excludeDomains || includeDeviceClasses) {
        for (const entity of entities) {
          if (!entity.device_id) {
            continue;
          }
          if (!(entity.device_id in deviceEntityLookup)) {
            deviceEntityLookup[entity.device_id] = [];
          }
          deviceEntityLookup[entity.device_id].push(entity);
        }
        inputDevices = devices;
        inputEntities = entities.filter((entity) => entity.area_id);
      } else {
        if (deviceFilter) {
          inputDevices = devices;
        }
        if (entityFilter) {
          inputEntities = entities.filter((entity) => entity.area_id);
        }
      }

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
          (entity) => !excludeDomains.includes(computeDomain(entity.entity_id))
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
        inputDevices = inputDevices!.filter((device) => deviceFilter!(device));
      }

      if (entityFilter) {
        inputEntities = inputEntities!.filter((entity) =>
          entityFilter!(entity)
        );
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
        outputAreas = areas.filter((area) => areaIds!.includes(area.area_id));
      }

      if (!outputAreas.length) {
        outputAreas = [
          {
            area_id: "",
            name: this.hass.localize("ui.components.area-picker.no_match"),
          },
        ];
      }

      return noAdd
        ? outputAreas
        : [
            ...outputAreas,
            {
              area_id: "add_new",
              name: this.hass.localize("ui.components.area-picker.add_new"),
            },
          ];
    }
  );

  protected updated(changedProps: PropertyValues) {
    if (
      (!this._init && this._devices && this._areas && this._entities) ||
      (changedProps.has("_opened") && this._opened)
    ) {
      this._init = true;
      (this.comboBox as any).items = this._getAreas(
        this._areas!,
        this._devices!,
        this._entities!,
        this.includeDomains,
        this.excludeDomains,
        this.includeDeviceClasses,
        this.deviceFilter,
        this.entityFilter,
        this.noAdd
      );
    }
  }

  protected render(): TemplateResult {
    if (!this._devices || !this._areas || !this._entities) {
      return html``;
    }
    return html`
      <vaadin-combo-box-light
        item-value-path="area_id"
        item-id-path="area_id"
        item-label-path="name"
        .value=${this._value}
        .disabled=${this.disabled}
        ${comboBoxRenderer(rowRenderer)}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._areaChanged}
      >
        <paper-input
          .label=${this.label === undefined && this.hass
            ? this.hass.localize("ui.components.area-picker.area")
            : this.label}
          .placeholder=${this.placeholder
            ? this._area(this.placeholder)?.name
            : undefined}
          .disabled=${this.disabled}
          class="input"
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        >
          ${this.value
            ? html`
                <mwc-icon-button
                  .label=${this.hass.localize(
                    "ui.components.area-picker.clear"
                  )}
                  slot="suffix"
                  class="clear-button"
                  @click=${this._clearValue}
                >
                  <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                </mwc-icon-button>
              `
            : ""}

          <mwc-icon-button
            .label=${this.hass.localize("ui.components.area-picker.toggle")}
            slot="suffix"
            class="toggle-button"
          >
            <ha-svg-icon
              .path=${this._opened ? mdiMenuUp : mdiMenuDown}
            ></ha-svg-icon>
          </mwc-icon-button>
        </paper-input>
      </vaadin-combo-box-light>
    `;
  }

  private _area = memoizeOne((areaId: string): AreaRegistryEntry | undefined =>
    this._areas?.find((area) => area.area_id === areaId)
  );

  private _clearValue(ev: Event) {
    ev.stopPropagation();
    this._setValue("");
  }

  private get _value() {
    return this.value || "";
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _areaChanged(ev: PolymerChangedEvent<string>) {
    const newValue = ev.detail.value;

    if (newValue !== "add_new") {
      if (newValue !== this._value) {
        this._setValue(newValue);
      }
      return;
    }

    (ev.target as any).value = this._value;
    showPromptDialog(this, {
      title: this.hass.localize("ui.components.area-picker.add_dialog.title"),
      text: this.hass.localize("ui.components.area-picker.add_dialog.text"),
      confirmText: this.hass.localize(
        "ui.components.area-picker.add_dialog.add"
      ),
      inputLabel: this.hass.localize(
        "ui.components.area-picker.add_dialog.name"
      ),
      confirm: async (name) => {
        if (!name) {
          return;
        }
        try {
          const area = await createAreaRegistryEntry(this.hass, {
            name,
          });
          this._areas = [...this._areas!, area];
          this._setValue(area.area_id);
        } catch (err) {
          showAlertDialog(this, {
            text: this.hass.localize(
              "ui.components.area-picker.add_dialog.failed_create_area"
            ),
          });
        }
      },
    });
  }

  private _setValue(value: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }

  static get styles(): CSSResultGroup {
    return css`
      paper-input > mwc-icon-button {
        --mdc-icon-button-size: 24px;
        padding: 2px;
        color: var(--secondary-text-color);
      }
      [hidden] {
        display: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-picker": HaAreaPicker;
  }
}
