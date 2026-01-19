import type { HassEntity } from "home-assistant-js-websocket";
import { mdiDragHorizontalVariant } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import Fuse from "fuse.js";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeEntityNameList } from "../../../../common/entity/compute_entity_name_display";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { computeRTL } from "../../../../common/util/compute_rtl";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import {
  multiTermSortedSearch,
  type FuseWeightedKey,
} from "../../../../resources/fuseMultiTerm";
import "../../../../components/ha-combo-box-item";
import "../../../../components/ha-domain-icon";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import "../../../../components/ha-generic-picker";
import type { PickerComboBoxItem } from "../../../../components/ha-picker-combo-box";
import "../../../../components/chips/ha-input-chip";
import "../../../../components/ha-sortable";
import "../../../../components/ha-state-icon";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import {
  AREA_CONTROLS_BUTTONS,
  getAreaControlEntities,
  MAX_DEFAULT_AREA_CONTROLS,
} from "../../card-features/hui-area-controls-card-feature";
import {
  AREA_CONTROL_DOMAINS,
  type AreaControl,
  type AreaControlDomain,
  type AreaControlsCardFeatureConfig,
} from "../../card-features/types";
import type { AreaCardFeatureContext } from "../../cards/hui-area-card";
import type { LovelaceCardFeatureEditor } from "../../types";

interface AreaControlPickerItem extends PickerComboBoxItem {
  type?: "domain" | "entity";
  stateObj?: HassEntity;
  domain?: string;
  deviceClass?: string;
}

type AreaControlsCardFeatureData = AreaControlsCardFeatureConfig & {
  customize_controls: boolean;
};

@customElement("hui-area-controls-card-feature-editor")
export class HuiAreaControlsCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: AreaCardFeatureContext;

  @state() private _config?: AreaControlsCardFeatureConfig;

  public setConfig(config: AreaControlsCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = [
    {
      name: "customize_controls",
      selector: {
        boolean: {},
      },
    },
  ] as const satisfies readonly HaFormSchema[];

  private _supportedControls = memoizeOne(
    (
      areaId: string,
      excludeEntities: string[] | undefined,
      // needed to update memoized function when entities, devices or areas change
      _entities: HomeAssistant["entities"],
      _devices: HomeAssistant["devices"],
      _areas: HomeAssistant["areas"]
    ) => {
      if (!this.hass) {
        return [];
      }
      const controlEntities = getAreaControlEntities(
        AREA_CONTROL_DOMAINS as unknown as AreaControlDomain[],
        areaId,
        excludeEntities,
        this.hass!
      );
      return (
        Object.keys(controlEntities) as (keyof typeof controlEntities)[]
      ).filter((control) => controlEntities[control].length > 0);
    }
  );

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
      currentValue: AreaControl[],
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
          currentValue.some((item) =>
            typeof item === "string" ? item === id : item.entity_id === id
          );

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

  protected render() {
    if (!this.hass || !this._config || !this.context?.area_id) {
      return nothing;
    }

    const supportedControls = this._supportedControls(
      this.context.area_id,
      this.context.exclude_entities,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas
    );

    if (supportedControls.length === 0) {
      return html`
        <ha-alert alert-type="warning">
          ${this.hass.localize(
            "ui.panel.lovelace.editor.features.types.area-controls.no_compatible_controls"
          )}
        </ha-alert>
      `;
    }

    const data: AreaControlsCardFeatureData = {
      ...this._config,
      customize_controls: this._config.controls !== undefined,
    };

    const value = this._config.controls || [];

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      ${data.customize_controls
        ? html`
            ${value.length
              ? html`
                  <ha-sortable
                    no-style
                    @item-moved=${this._itemMoved}
                    handle-selector="button.primary.action"
                  >
                    <ha-chip-set>
                      ${repeat(
                        value,
                        (item) =>
                          typeof item === "string" ? item : item.entity_id,
                        (item, idx) => {
                          const label = this._getItemLabel(item);
                          return html`
                            <ha-input-chip
                              .idx=${idx}
                              @remove=${this._removeItem}
                              .label=${label}
                              selected
                            >
                              <ha-svg-icon
                                slot="icon"
                                .path=${mdiDragHorizontalVariant}
                              ></ha-svg-icon>
                              ${label}
                            </ha-input-chip>
                          `;
                        }
                      )}
                    </ha-chip-set>
                  </ha-sortable>
                `
              : nothing}
            <ha-generic-picker
              .hass=${this.hass}
              .value=${""}
              .addButtonLabel=${this.hass.localize(
                "ui.panel.lovelace.editor.features.types.area-controls.controls"
              )}
              .getItems=${this._getItems(
                this.context.area_id,
                this.context.exclude_entities,
                value,
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
              @value-changed=${this._controlChanged}
            ></ha-generic-picker>
          `
        : nothing}
    `;
  }

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

  private _getItemLabel(item: AreaControl): string {
    if (!this.hass) {
      return typeof item === "string" ? item : JSON.stringify(item);
    }

    if (typeof item === "string") {
      if (AREA_CONTROL_DOMAINS.includes(item as AreaControlDomain)) {
        return this.hass.localize(
          `ui.panel.lovelace.editor.features.types.area-controls.controls_options.${item}`
        );
      }
      // Invalid/unknown domain string
      return item;
    }

    if ("entity_id" in item) {
      const entityState = this.hass.states[item.entity_id];
      if (entityState) {
        return computeStateName(entityState);
      }
      return item.entity_id;
    }

    return JSON.stringify(item);
  }

  private _itemMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const controls = [...(this._config!.controls || [])];
    const item = controls.splice(oldIndex, 1)[0];
    controls.splice(newIndex, 0, item);
    this._updateControls(controls);
  }

  private _removeItem(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).idx;
    const controls = [...(this._config!.controls || [])];
    controls.splice(index, 1);
    this._updateControls(controls);
  }

  private _controlChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (!value) {
      return;
    }
    // If it's a domain control (in AREA_CONTROL_DOMAINS), save as string for backwards compatibility
    // If it's an entity, save in explicit format
    const control = AREA_CONTROL_DOMAINS.includes(value as AreaControlDomain)
      ? value
      : { entity_id: value };
    const controls = [...(this._config!.controls || []), control];
    this._updateControls(controls);
  }

  private _updateControls(controls: AreaControl[]): void {
    const config = { ...this._config!, controls };
    fireEvent(this, "config-changed", { config });
  }

  private _valueChanged(ev: CustomEvent): void {
    const { customize_controls, ...config } = ev.detail
      .value as AreaControlsCardFeatureData;

    if (customize_controls && !config.controls) {
      config.controls = this._supportedControls(
        this.context!.area_id!,
        this.context!.exclude_entities,
        this.hass!.entities,
        this.hass!.devices,
        this.hass!.areas
      ).slice(0, MAX_DEFAULT_AREA_CONTROLS); // Limit to max default controls
    }

    if (!customize_controls && config.controls) {
      delete config.controls;
    }

    fireEvent(this, "config-changed", { config: config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof this._schema>
  ) => {
    switch (schema.name) {
      case "customize_controls":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.features.types.area-controls.${schema.name}`
        );
      default:
        return "";
    }
  };

  static styles = css`
    ha-sortable {
      display: block;
      margin-bottom: var(--ha-space-2);
    }
    ha-chip-set {
      margin-bottom: var(--ha-space-2);
    }
    .code {
      font-family: var(--ha-font-family-code);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-area-controls-card-feature-editor": HuiAreaControlsCardFeatureEditor;
  }
}
