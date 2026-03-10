import { mdiPlus, mdiTextureBox } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeAreaName } from "../common/entity/compute_area_name";
import { computeFloorName } from "../common/entity/compute_floor_name";
import { getAreaContext } from "../common/entity/context/get_area_context";
import { areaComboBoxKeys, getAreas } from "../data/area/area_picker";
import { createAreaRegistryEntry } from "../data/area/area_registry";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import { showAreaRegistryDetailDialog } from "../panels/config/areas/show-dialog-area-registry-detail";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-combo-box-item";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import "./ha-icon-button";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import type { PickerValueRenderer } from "./ha-picker-field";
import "./ha-svg-icon";

const ADD_NEW_ID = "___ADD_NEW___";

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
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: (entity: HassEntity) => boolean;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ attribute: "add-button-label" }) public addButtonLabel?: string;

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  public async open() {
    await this.updateComplete;
    await this._picker?.open();
  }

  private _getAreasMemoized = memoizeOne(getAreas);

  // Recompute value renderer when the areas change
  private _computeValueRenderer = memoizeOne(
    (_haAreas: HomeAssistant["areas"]): PickerValueRenderer =>
      (value) => {
        const area = this.hass.areas[value];

        if (!area) {
          return html`
            <ha-svg-icon slot="start" .path=${mdiTextureBox}></ha-svg-icon>
            <span slot="headline">${area}</span>
          `;
        }

        const { floor } = getAreaContext(area, this.hass.floors);

        const areaName = area ? computeAreaName(area) : undefined;
        const floorName = floor ? computeFloorName(floor) : undefined;

        const icon = area.icon;

        return html`
          ${icon
            ? html`<ha-icon slot="start" .icon=${icon}></ha-icon>`
            : html`<ha-svg-icon
                slot="start"
                .path=${mdiTextureBox}
              ></ha-svg-icon>`}
          <span slot="headline">${areaName}</span>
          ${floorName
            ? html`<span slot="supporting-text">${floorName}</span>`
            : nothing}
        `;
      }
  );

  private _getItems = () =>
    this._getAreasMemoized(
      this.hass.areas,
      this.hass.floors,
      this.hass.devices,
      this.hass.entities,
      this.hass.states,
      this.includeDomains,
      this.excludeDomains,
      this.includeDeviceClasses,
      this.deviceFilter,
      this.entityFilter,
      this.excludeAreas
    );

  private _allAreaNames = memoizeOne(
    (areas: HomeAssistant["areas"]) =>
      Object.values(areas)
        .map((area) => computeAreaName(area)?.toLowerCase())
        .filter(Boolean) as string[]
  );

  private _getAdditionalItems = (
    searchString?: string
  ): PickerComboBoxItem[] => {
    if (this.noAdd) {
      return [];
    }

    const allAreas = this._allAreaNames(this.hass.areas);

    if (searchString && !allAreas.includes(searchString.toLowerCase())) {
      return [
        {
          id: ADD_NEW_ID + searchString,
          primary: this.hass.localize(
            "ui.components.area-picker.add_new_suggestion",
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
        primary: this.hass.localize("ui.components.area-picker.add_new"),
        icon_path: mdiPlus,
      },
    ];
  };

  protected render(): TemplateResult {
    const baseLabel =
      this.label ?? this.hass.localize("ui.components.area-picker.area");
    const valueRenderer = this._computeValueRenderer(this.hass.areas);

    // Only show label if there's no floor
    let label: string | undefined = baseLabel;
    if (this.value && baseLabel) {
      const area = this.hass.areas[this.value];
      if (area) {
        const { floor } = getAreaContext(area, this.hass.floors);
        if (floor) {
          label = undefined;
        }
      }
    }

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        .label=${label}
        .helper=${this.helper}
        .notFoundLabel=${this._notFoundLabel}
        .emptyLabel=${this.hass.localize("ui.components.area-picker.no_areas")}
        .disabled=${this.disabled}
        .required=${this.required}
        .value=${this.value}
        .getItems=${this._getItems}
        .getAdditionalItems=${this._getAdditionalItems}
        .valueRenderer=${valueRenderer}
        .addButtonLabel=${this.addButtonLabel}
        .searchKeys=${areaComboBoxKeys}
        .unknownItemText=${this.hass.localize(
          "ui.components.area-picker.unknown"
        )}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const value = ev.detail.value;

    if (!value) {
      this._setValue(undefined);
      return;
    }

    if (value.startsWith(ADD_NEW_ID)) {
      this.hass.loadFragmentTranslation("config");

      const suggestedName = value.substring(ADD_NEW_ID.length);

      showAreaRegistryDetailDialog(this, {
        suggestedName: suggestedName,
        createEntry: async (values) => {
          try {
            const area = await createAreaRegistryEntry(this.hass, values);
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
      return;
    }

    this._setValue(value);
  }

  private _setValue(value?: string) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
    fireEvent(this, "change");
  }

  private _notFoundLabel = (search: string) =>
    this.hass.localize("ui.components.area-picker.no_match", {
      term: html`<b>‘${search}’</b>`,
    });
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-picker": HaAreaPicker;
  }
}
