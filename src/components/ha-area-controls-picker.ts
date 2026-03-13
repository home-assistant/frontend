import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import Fuse from "fuse.js";
import memoizeOne from "memoize-one";
import { computeEntityNameList } from "../common/entity/compute_entity_name_display";
import { computeRTL } from "../common/util/compute_rtl";
import type { LocalizeFunc } from "../common/translations/localize";
import {
  multiTermSortedSearch,
  type FuseWeightedKey,
} from "../resources/fuseMultiTerm";
import {
  AREA_CONTROLS_BUTTONS,
  getAreaControlEntities,
  type AreaControlDomain,
} from "../data/area/area_controls";
import type { HomeAssistant } from "../types";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import "./ha-combo-box-item";
import "./ha-domain-icon";
import "./ha-generic-picker";
import "./ha-state-icon";

export interface AreaControlPickerItem extends PickerComboBoxItem {
  type?: "domain" | "entity";
  stateObj?: HassEntity;
  domain?: string;
  deviceClass?: string;
}

const AREA_CONTROL_DOMAINS: readonly AreaControlDomain[] = [
  "light",
  "fan",
  "switch",
  "cover-shutter",
  "cover-blind",
  "cover-curtain",
  "cover-shade",
  "cover-awning",
  "cover-garage",
  "cover-gate",
  "cover-door",
  "cover-window",
  "cover-damper",
] as const;

@customElement("ha-area-controls-picker")
export class HaAreaControlsPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "area-id" }) public areaId!: string;

  @property({ type: Array, attribute: "exclude-entities" })
  public excludeEntities?: string[];

  @property() public value?: string;

  @property({ type: Array, attribute: "exclude-values" })
  public excludeValues?: string[];

  @property() public label?: string;

  @property() public placeholder?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ attribute: "add-button-label" }) public addButtonLabel?: string;

  private _domainSearchKeys: FuseWeightedKey[] = [
    {
      name: "primary",
      weight: 10,
    },
  ];

  private _entitySearchKeys: FuseWeightedKey[] = [
    {
      name: "primary",
      weight: 10,
    },
    {
      name: "secondary",
      weight: 5,
    },
    {
      name: "id",
      weight: 3,
    },
  ];

  private _createFuseIndex = (
    items: AreaControlPickerItem[],
    keys: FuseWeightedKey[]
  ) => Fuse.createIndex(keys, items);

  private _domainFuseIndex = memoizeOne((items: AreaControlPickerItem[]) =>
    this._createFuseIndex(items, this._domainSearchKeys)
  );

  private _entityFuseIndex = memoizeOne((items: AreaControlPickerItem[]) =>
    this._createFuseIndex(items, this._entitySearchKeys)
  );

  private _getItems = memoizeOne(
    (
      areaId: string,
      excludeEntities: string[] | undefined,
      currentValue: string | undefined,
      excludeValues: string[] | undefined,
      localize: LocalizeFunc,
      _entities: HomeAssistant["entities"],
      _devices: HomeAssistant["devices"],
      _areas: HomeAssistant["areas"]
    ): ((
      searchString?: string,
      section?: string
    ) => (AreaControlPickerItem | string)[]) =>
      (searchString?: string, section?: string) => {
        if (!this.hass) {
          return [];
        }

        const isSelected = (id: string): boolean =>
          currentValue === id ||
          (excludeValues !== undefined && excludeValues.includes(id));

        const controlEntities = getAreaControlEntities(
          AREA_CONTROL_DOMAINS as unknown as AreaControlDomain[],
          areaId,
          excludeEntities,
          this.hass
        );

        const items: (AreaControlPickerItem | string)[] = [];
        let domainItems: AreaControlPickerItem[] = [];
        let entityItems: AreaControlPickerItem[] = [];

        if (!section || section === "domain") {
          const supportedControls = (
            Object.keys(controlEntities) as (keyof typeof controlEntities)[]
          ).filter((control) => controlEntities[control].length > 0);

          supportedControls.forEach((control) => {
            if (isSelected(control)) {
              return;
            }
            const label = localize(
              `ui.panel.lovelace.editor.features.types.area-controls.controls_options.${control}`
            );
            const button = AREA_CONTROLS_BUTTONS[control];
            const deviceClass = button.filter.device_class
              ? Array.isArray(button.filter.device_class)
                ? button.filter.device_class[0]
                : button.filter.device_class
              : undefined;

            domainItems.push({
              type: "domain",
              id: control,
              primary: label,
              domain: button.filter.domain,
              deviceClass,
            });
          });

          if (searchString) {
            const fuseIndex = this._domainFuseIndex(domainItems);
            domainItems = multiTermSortedSearch(
              domainItems,
              searchString,
              this._domainSearchKeys,
              (item) => item.id,
              fuseIndex
            );
          }
        }

        if (!section || section === "entity") {
          const allEntityIds = Object.values(controlEntities).flat();
          const uniqueEntityIds = Array.from(new Set(allEntityIds));

          const isRTL = computeRTL(this.hass);

          uniqueEntityIds.forEach((entityId) => {
            if (isSelected(entityId)) {
              return;
            }
            const stateObj = this.hass!.states[entityId];
            if (!stateObj) {
              return;
            }

            const [entityName, deviceName, areaName] = computeEntityNameList(
              stateObj,
              [{ type: "entity" }, { type: "device" }, { type: "area" }],
              this.hass!.entities,
              this.hass!.devices,
              this.hass!.areas,
              this.hass!.floors
            );

            const primary = entityName || deviceName || entityId;
            const secondary = [areaName, entityName ? deviceName : undefined]
              .filter(Boolean)
              .join(isRTL ? " ◂ " : " ▸ ");

            entityItems.push({
              type: "entity",
              id: entityId,
              primary,
              secondary,
              stateObj,
            });
          });

          if (searchString) {
            const fuseIndex = this._entityFuseIndex(entityItems);
            entityItems = multiTermSortedSearch(
              entityItems,
              searchString,
              this._entitySearchKeys,
              (item) => item.id,
              fuseIndex
            );
          }
        }

        // Only add section headers if there are items in that section
        if (!section) {
          if (domainItems.length > 0) {
            items.push(
              localize(
                "ui.panel.lovelace.editor.features.types.area-controls.sections.domain"
              )
            );
            items.push(...domainItems);
          }
          if (entityItems.length > 0) {
            items.push(
              localize(
                "ui.panel.lovelace.editor.features.types.area-controls.sections.entity"
              )
            );
            items.push(...entityItems);
          }
        } else {
          items.push(...domainItems, ...entityItems);
        }

        return items;
      }
  );

  private _rowRenderer = (item: AreaControlPickerItem) => html`
    <ha-combo-box-item type="button" compact>
      ${item.type === "entity" && item.stateObj
        ? html`<ha-state-icon
            slot="start"
            .hass=${this.hass}
            .stateObj=${item.stateObj}
          ></ha-state-icon>`
        : item.domain
          ? html`<ha-domain-icon
              slot="start"
              .hass=${this.hass}
              .domain=${item.domain}
              .deviceClass=${item.deviceClass}
            ></ha-domain-icon>`
          : nothing}
      <span slot="headline">${item.primary}</span>
      ${item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing}
      ${item.type === "entity" && item.stateObj
        ? html`<span slot="supporting-text" class="code">
            ${item.stateObj.entity_id}
          </span>`
        : nothing}
    </ha-combo-box-item>
  `;

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .value=${this.value || ""}
        .disabled=${this.disabled}
        .required=${this.required}
        .label=${this.label}
        .placeholder=${this.placeholder}
        .helper=${this.helper}
        .addButtonLabel=${this.addButtonLabel}
        .getItems=${this._getItems(
          this.areaId,
          this.excludeEntities,
          this.value,
          this.excludeValues,
          this.hass.localize,
          this.hass.entities,
          this.hass.devices,
          this.hass.areas
        )}
        .rowRenderer=${this._rowRenderer as any}
        .sections=${[
          {
            id: "domain",
            label: this.hass.localize(
              "ui.panel.lovelace.editor.features.types.area-controls.sections.domain"
            ),
          },
          {
            id: "entity",
            label: this.hass.localize(
              "ui.panel.lovelace.editor.features.types.area-controls.sections.entity"
            ),
          },
        ]}
      ></ha-generic-picker>
    `;
  }

  static styles = css`
    .code {
      font-family: var(--ha-font-family-code);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-controls-picker": HaAreaControlsPicker;
  }
}
