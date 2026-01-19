import "@home-assistant/webawesome/dist/components/tree-item/tree-item";
import "@home-assistant/webawesome/dist/components/tree/tree";
import type { WaSelectionChangeEvent } from "@home-assistant/webawesome/dist/events/selection-change";
import { consume } from "@lit/context";
import { mdiTextureBox } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  html,
  LitElement,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeEntityNameList } from "../../../../common/entity/compute_entity_name_display";
import { stringCompare } from "../../../../common/string/compare";
import "../../../../components/ha-floor-icon";
import "../../../../components/ha-icon";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-section-title";
import "../../../../components/ha-state-icon";
import "../../../../components/ha-svg-icon";
import {
  getAreaDeviceLookup,
  getAreaEntityLookup,
} from "../../../../data/area/area_registry";
import {
  getAreasNestedInFloors,
  type AreaFloorValue,
  type FloorComboBoxItem,
  type FloorNestedComboBoxItem,
  type UnassignedAreasFloorComboBoxItem,
} from "../../../../data/area_floor_picker";
import {
  getConfigEntries,
  type ConfigEntry,
} from "../../../../data/config_entries";
import {
  areasContext,
  devicesContext,
  entitiesContext,
  floorsContext,
  labelsContext,
  localizeContext,
  statesContext,
} from "../../../../data/context";
import { getDeviceEntityLookup } from "../../../../data/device/device_registry";
import {
  domainToName,
  type DomainManifestLookup,
} from "../../../../data/integration";
import { getLabels } from "../../../../data/label/label_picker";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import {
  TARGET_SEPARATOR,
  type SingleHassServiceTarget,
} from "../../../../data/target";
import type { HomeAssistant } from "../../../../types";
import { brandsUrl } from "../../../../util/brands-url";

interface Level1Entries {
  open: boolean;
  areas?: Record<string, Level2Entries>;
  devices?: Record<string, Level3Entries>;
}

interface Level2Entries {
  open: boolean;
  devices: Record<string, Level3Entries>;
  entities: string[];
}

interface Level3Entries {
  open: boolean;
  entities: string[];
}

@customElement("ha-automation-add-from-target")
export default class HaAutomationAddFromTarget extends LitElement {
  // #region properties
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public value?: SingleHassServiceTarget;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public manifests?: DomainManifestLookup;

  // #endregion properties

  // #region context
  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: HomeAssistant["localize"];

  @state()
  @consume({ context: statesContext, subscribe: true })
  private states!: HomeAssistant["states"];

  @state()
  @consume({ context: floorsContext, subscribe: true })
  private floors!: HomeAssistant["floors"];

  @state()
  @consume({ context: areasContext, subscribe: true })
  private areas!: HomeAssistant["areas"];

  @state()
  @consume({ context: devicesContext, subscribe: true })
  private devices!: HomeAssistant["devices"];

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private entities!: HomeAssistant["entities"];

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry!: LabelRegistryEntry[];
  // #endregion context

  // #region state and variables

  @state()
  private _floorAreas: (
    | FloorNestedComboBoxItem
    | UnassignedAreasFloorComboBoxItem
  )[] = [];

  @state() private _entries: Record<string, Level1Entries> = {};

  @state() private _showShowMoreButton?: boolean;

  @state() private _fullHeight = false;

  private _configEntryLookup: Record<string, ConfigEntry> = {};

  // #endregion state and variables

  // #region lifecycle

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._initialDataLoad();
    }

    if (changedProps.has("value") || changedProps.has("narrow")) {
      this._fullHeight =
        !this.narrow || !this.value || !Object.values(this.value)[0];
      this.style.setProperty("--max-height", this._fullHeight ? "none" : "50%");
    }
  }

  protected updated(changedProps: PropertyValues) {
    if (
      changedProps.has("value") ||
      changedProps.has("narrow") ||
      this._showShowMoreButton === undefined
    ) {
      this._setShowTargetShowMoreButton();
    }
  }

  private async _initialDataLoad() {
    await this._loadConfigEntries();
    this._getTreeData();
  }

  private async _setShowTargetShowMoreButton() {
    await this.updateComplete;
    this._showShowMoreButton =
      this.narrow &&
      this.value &&
      !!Object.values(this.value)[0] &&
      this.scrollHeight > this.clientHeight;
  }

  // #endregion lifecycle

  // #region render
  protected render() {
    if (!this.manifests || !this._configEntryLookup) {
      return nothing;
    }

    return html`
      ${this.narrow && this.value
        ? this._renderNarrow(this._entries, this.value)
        : html`
            ${this._renderFloors(this.narrow, this._entries, this.value)}
            ${this._renderUnassigned(this.narrow, this._entries, this.value)}
            ${this._renderLabels(this.narrow, this.value)}
          `}
      ${this.narrow && this._showShowMoreButton && !this._fullHeight
        ? html`
            <div class="targets-show-more">
              <ha-button appearance="filled" @click=${this._expandHeight}>
                ${this.localize("ui.panel.config.automation.editor.show_more")}
              </ha-button>
            </div>
          `
        : nothing}
    `;
  }

  private _renderNarrow = memoizeOne(
    (
      entries: Record<string, Level1Entries>,
      value: SingleHassServiceTarget
    ) => {
      const [valueTypeId, valueId] = Object.entries(value)[0];
      const valueType = valueTypeId.replace("_id", "");

      if (!valueType || valueType === "label") {
        return nothing;
      }

      // floor areas, unassigned areas
      if (valueType === "floor") {
        return this._renderAreas(
          entries[`floor${TARGET_SEPARATOR}${valueId ?? ""}`].areas!
        );
      }

      if (valueType === "area" && valueId) {
        const floor =
          entries[
            `floor${TARGET_SEPARATOR}${this.areas[valueId]?.floor_id || ""}`
          ];
        const { devices, entities } =
          floor.areas![`area${TARGET_SEPARATOR}${valueId}`];
        const numberOfDevices = Object.keys(devices).length;

        return html`
          ${numberOfDevices ? this._renderDevices(devices) : nothing}
          ${entities.length ? this._renderEntities(entities) : nothing}
        `;
      }

      if ((!valueId && valueType === "area") || valueType === "service") {
        const floor = entries[`${valueType}${TARGET_SEPARATOR}`];
        const devices = floor.devices!;

        return this._renderDevices(devices);
      }

      if (valueId && valueType === "device") {
        const areaId = this.devices[valueId]?.area_id;
        if (areaId) {
          const floorId = this.areas[areaId]?.floor_id || "";
          const { entities } =
            entries[`floor${TARGET_SEPARATOR}${floorId}`].areas![
              `area${TARGET_SEPARATOR}${areaId}`
            ].devices![valueId];

          return entities.length ? this._renderEntities(entities) : nothing;
        }

        const device = this.devices[valueId];
        const isService = device.entry_type === "service";
        const { entities } =
          entries[`${isService ? "service" : "area"}${TARGET_SEPARATOR}`]
            .devices![valueId];
        return entities.length ? this._renderEntities(entities) : nothing;
      }

      if (valueType === "device" || valueType === "helper") {
        const { devices } = entries[`${valueType}${TARGET_SEPARATOR}`];
        return this._renderDomains(
          devices!,
          valueType === "device" ? "entity_" : "helper_"
        );
      }

      if (
        !valueId &&
        (valueType.startsWith("entity") || valueType.startsWith("helper"))
      ) {
        const { entities } =
          entries[
            `${valueType.startsWith("entity") ? "device" : "helper"}${TARGET_SEPARATOR}`
          ].devices![`${valueType}${TARGET_SEPARATOR}`];
        return this._renderEntities(entities);
      }

      return nothing;
    }
  );

  private _renderFloors = memoizeOne(
    (
      narrow: boolean,
      entries: Record<string, Level1Entries>,
      value?: SingleHassServiceTarget
    ) => {
      const emptyFloors =
        !this._floorAreas.length ||
        (!this._floorAreas[0].id && !this._floorAreas[0].areas.length);

      const floorAreas = emptyFloors
        ? undefined
        : this._floorAreas.map((floor, index) =>
            index === 0 && !floor.id
              ? this._renderAreas(
                  entries[floor.id || `floor${TARGET_SEPARATOR}`].areas!
                )
              : this._renderItem(
                  !floor.id
                    ? this.localize(
                        "ui.panel.config.automation.editor.other_areas"
                      )
                    : floor.primary,
                  floor.id || `floor${TARGET_SEPARATOR}`,
                  !floor.id,
                  !!floor.id && this._getSelectedTargetId(value) === floor.id,
                  !entries[floor.id || `floor${TARGET_SEPARATOR}`].open &&
                    !!Object.keys(
                      entries[floor.id || `floor${TARGET_SEPARATOR}`].areas!
                    ).length,
                  entries[floor.id || `floor${TARGET_SEPARATOR}`].open,
                  this._renderFloorIcon(floor as FloorNestedComboBoxItem),
                  entries[floor.id || `floor${TARGET_SEPARATOR}`].open
                    ? this._renderAreas(
                        entries[floor.id || `floor${TARGET_SEPARATOR}`].areas!
                      )
                    : undefined
                )
          );
      return html`<ha-section-title
          >${this.localize(
            "ui.panel.config.automation.editor.home"
          )}</ha-section-title
        >
        ${emptyFloors
          ? html`<ha-md-list>
              <ha-md-list-item type="text">
                <div slot="headline">
                  ${this.localize("ui.components.area-picker.no_areas")}
                </div>
              </ha-md-list-item>
            </ha-md-list>`
          : html`${narrow
              ? html`<ha-md-list>${floorAreas}</ha-md-list>`
              : html`<wa-tree
                  @wa-selection-change=${this._handleSelectionChange}
                  >${floorAreas}</wa-tree
                >`}`}`;
    }
  );

  private _renderLabels = memoizeOne(
    (narrow: boolean, value?: SingleHassServiceTarget) => {
      const labels = this._getLabelsMemoized(
        this.states,
        this.areas,
        this.devices,
        this.entities,
        this._labelRegistry,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        `label${TARGET_SEPARATOR}`
      );

      if (!labels.length) {
        return nothing;
      }

      return html`<ha-section-title
          >${this.localize(
            "ui.components.label-picker.labels"
          )}</ha-section-title
        >
        <ha-md-list>
          ${labels.map(
            (label) =>
              html`<ha-md-list-item
                interactive
                type="button"
                .target=${label.id}
                @click=${this._selectItem}
                class=${this._getSelectedTargetId(value) === label.id
                  ? "selected"
                  : ""}
                >${label.icon
                  ? html`<ha-icon slot="start" .icon=${label.icon}></ha-icon>`
                  : label.icon_path
                    ? html`<ha-svg-icon
                        slot="start"
                        .path=${label.icon_path}
                      ></ha-svg-icon>`
                    : nothing}
                <div slot="headline">${label.primary}</div>
                ${narrow
                  ? html`<ha-icon-next slot="end"></ha-icon-next> `
                  : nothing}
              </ha-md-list-item>`
          )}
        </ha-md-list>`;
    }
  );

  private _renderUnassigned = memoizeOne(
    (
      narrow: boolean,
      entries: Record<string, Level1Entries>,
      _value?: SingleHassServiceTarget
    ) => {
      const unassignedDevicesLength = Object.keys(
        entries[`area${TARGET_SEPARATOR}`]?.devices || {}
      ).length;
      const unassignedServicesLength = Object.keys(
        entries[`service${TARGET_SEPARATOR}`]?.devices || {}
      ).length;
      const unassignedEntitiesLength = Object.keys(
        entries[`device${TARGET_SEPARATOR}`]?.devices || {}
      ).length;
      const unassignedHelpersLength = Object.keys(
        entries[`helper${TARGET_SEPARATOR}`]?.devices || {}
      ).length;

      if (
        !unassignedDevicesLength &&
        !unassignedServicesLength &&
        !unassignedEntitiesLength &&
        !unassignedHelpersLength
      ) {
        return nothing;
      }

      const items: TemplateResult[] = [];

      if (unassignedEntitiesLength) {
        const open = entries[`device${TARGET_SEPARATOR}`].open;
        items.push(
          this._renderItem(
            this.localize("ui.components.target-picker.type.entities"),
            `device${TARGET_SEPARATOR}`,
            true,
            false,
            !open,
            open,
            undefined,
            entries[`device${TARGET_SEPARATOR}`].open
              ? this._renderDomains(
                  entries[`device${TARGET_SEPARATOR}`].devices!,
                  "entity_"
                )
              : undefined
          )
        );
      }

      if (unassignedHelpersLength) {
        const open = entries[`helper${TARGET_SEPARATOR}`].open;
        items.push(
          this._renderItem(
            this.localize("ui.panel.config.automation.editor.helpers"),
            `helper${TARGET_SEPARATOR}`,
            true,
            false,
            !open,
            open,
            undefined,
            entries[`helper${TARGET_SEPARATOR}`].open
              ? this._renderDomains(
                  entries[`helper${TARGET_SEPARATOR}`].devices!,
                  "helper_"
                )
              : undefined
          )
        );
      }

      if (unassignedDevicesLength) {
        const open = entries[`area${TARGET_SEPARATOR}`].open;
        items.push(
          this._renderItem(
            this.localize("ui.components.target-picker.type.devices"),
            `area${TARGET_SEPARATOR}`,
            true,
            false,
            !open,
            open,
            undefined,
            entries[`area${TARGET_SEPARATOR}`].open
              ? this._renderDevices(entries[`area${TARGET_SEPARATOR}`].devices!)
              : undefined
          )
        );
      }

      if (unassignedServicesLength) {
        const open = entries[`service${TARGET_SEPARATOR}`].open;
        items.push(
          this._renderItem(
            this.localize("ui.panel.config.automation.editor.services"),
            `service${TARGET_SEPARATOR}`,
            true,
            false,
            !open,
            open,
            undefined,
            entries[`service${TARGET_SEPARATOR}`].open
              ? this._renderDevices(
                  entries[`service${TARGET_SEPARATOR}`].devices!
                )
              : undefined
          )
        );
      }

      return html`<ha-section-title
          >${this.localize(
            "ui.panel.config.automation.editor.unassigned"
          )}</ha-section-title
        >${narrow
          ? html`<ha-md-list>${items}</ha-md-list>`
          : html`<wa-tree @wa-selection-change=${this._handleSelectionChange}>
              ${items}
            </wa-tree>`} `;
    }
  );

  private _renderAreas(areas: Record<string, Level2Entries>) {
    const renderedAreas = Object.keys(areas)
      .filter((areaTargetId) => {
        const [, areaId] = areaTargetId.split(TARGET_SEPARATOR, 2);
        return this.areas[areaId];
      })
      .map((areaTargetId) => {
        const [, areaId] = areaTargetId.split(TARGET_SEPARATOR, 2);
        const area = this.areas[areaId];
        return [
          areaTargetId,
          computeAreaName(area) || area.area_id,
          area.floor_id || undefined,
          area.icon,
        ] as [string, string, string | undefined, string | undefined];
      })
      .map(([areaTargetId, areaName, floorId, areaIcon]) => {
        const { open, devices, entities } =
          this._entries[`floor${TARGET_SEPARATOR}${floorId || ""}`].areas![
            areaTargetId
          ];
        const numberOfDevices = Object.keys(devices).length;
        const numberOfItems = numberOfDevices + entities.length;

        return this._renderItem(
          areaName,
          areaTargetId,
          false,
          this._getSelectedTargetId(this.value) === areaTargetId,
          !open && !!numberOfItems,
          open,
          this._renderAreaIcon(areaIcon),
          open
            ? html`
                ${numberOfDevices ? this._renderDevices(devices) : nothing}
                ${entities.length ? this._renderEntities(entities) : nothing}
              `
            : undefined
        );
      });

    if (this.narrow) {
      return html`<ha-section-title
          >${this.localize(
            "ui.components.target-picker.type.areas"
          )}</ha-section-title
        >
        <ha-md-list>${renderedAreas}</ha-md-list>`;
    }

    return renderedAreas;
  }

  private _renderDevices(devices: Record<string, Level3Entries>) {
    const renderedDevices = Object.keys(devices)
      .filter((deviceId) => this.devices[deviceId])
      .map((deviceId) => {
        const device = this.devices[deviceId];
        const configEntry = device.primary_config_entry
          ? this._configEntryLookup?.[device.primary_config_entry]
          : undefined;
        const domain = configEntry?.domain;

        const deviceName = computeDeviceName(device) || deviceId;

        return [deviceId, deviceName, domain] as [
          string,
          string | undefined,
          string | undefined,
        ];
      })
      .sort(([, deviceNameA = "zzz"], [, deviceNameB = "zzz"]) =>
        stringCompare(deviceNameA, deviceNameB, this.hass.locale.language)
      )
      .map(([deviceId, deviceName, domain]) => {
        const { open, entities } = devices[deviceId];

        return this._renderItem(
          deviceName || deviceId,
          `device${TARGET_SEPARATOR}${deviceId}`,
          false,
          this._getSelectedTargetId(this.value) ===
            `device${TARGET_SEPARATOR}${deviceId}`,
          !open && !!entities.length,
          open,
          domain ? this._renderDomainIcon(domain) : undefined,
          open ? this._renderEntities(entities) : undefined
        );
      });

    if (this.narrow) {
      return html`<ha-section-title
          >${this.localize(
            "ui.components.target-picker.type.devices"
          )}</ha-section-title
        >
        <ha-md-list>${renderedDevices}</ha-md-list>`;
    }

    return renderedDevices;
  }

  private _renderDomains(
    domains: Record<string, Level3Entries>,
    prefix: "helper_" | "entity_"
  ) {
    const renderedDomains = Object.keys(domains)
      .map((domainTargetId) => {
        const domain = domainTargetId.substring(
          prefix.length,
          domainTargetId.length - TARGET_SEPARATOR.length
        );
        const label = domainToName(
          this.localize,
          domain,
          this.manifests![domain]
        );

        return [domainTargetId, label, domain] as [string, string, string];
      })
      .sort(([, labelA = "zzz"], [, labelB = "zzz"]) =>
        stringCompare(labelA, labelB, this.hass.locale.language)
      )
      .map(([domainTargetId, label, domain]) => {
        const { open, entities } = domains[domainTargetId];
        return this._renderItem(
          label,
          domainTargetId,
          true,
          false,
          !open && !!entities.length,
          open,
          this._renderDomainIcon(domain),
          open ? this._renderEntities(entities) : undefined
        );
      });

    if (this.narrow) {
      return html`<ha-section-title
          >${this.localize(
            "ui.components.target-picker.type.devices"
          )}</ha-section-title
        >
        <ha-md-list> ${renderedDomains} </ha-md-list>`;
    }

    return renderedDomains;
  }

  private _renderEntities(entities: string[] = []) {
    if (!entities.length) {
      return nothing;
    }

    const renderedEntites = entities
      .filter((entityId) => this.states[entityId])
      .map((entityId) => {
        const stateObj = this.states[entityId];

        const [entityName, deviceName] = computeEntityNameList(
          stateObj,
          [{ type: "entity" }, { type: "device" }, { type: "area" }],
          this.entities,
          this.devices,
          this.areas,
          this.floors
        );

        let label = entityName || deviceName || entityId;

        if (this.entities[entityId]?.hidden) {
          label += ` (${this.localize("ui.panel.config.automation.editor.entity_hidden")})`;
        }

        return [entityId, label, stateObj] as [string, string, HassEntity];
      })
      .sort(([, labelA], [, labelB]) =>
        stringCompare(labelA, labelB, this.hass.locale.language)
      )
      .map(([entityId, label, stateObj]) =>
        this._renderItem(
          label,
          `entity${TARGET_SEPARATOR}${entityId}`,
          false,
          this._getSelectedTargetId(this.value) ===
            `entity${TARGET_SEPARATOR}${entityId}`,
          false,
          false,
          this._renderEntityIcon(stateObj)
        )
      );

    if (this.narrow) {
      return html`<ha-section-title
          >${this.localize(
            "ui.components.target-picker.type.entities"
          )}</ha-section-title
        >
        <ha-md-list>${renderedEntites}</ha-md-list>`;
    }

    return renderedEntites;
  }

  private _renderFloorIcon =
    (floor: FloorNestedComboBoxItem) => (slot: string | undefined) => {
      if (floor.id && floor.floor) {
        return html`<ha-floor-icon
          slot=${ifDefined(slot)}
          .floor=${floor.floor}
        ></ha-floor-icon>`;
      }
      return html`<ha-svg-icon
        slot=${ifDefined(slot)}
        .path=${mdiTextureBox}
      ></ha-svg-icon>`;
    };

  private _renderAreaIcon =
    (areaIcon?: string) => (slot: string | undefined) =>
      areaIcon
        ? html`<ha-icon slot=${ifDefined(slot)} .icon=${areaIcon}></ha-icon>`
        : html`<ha-svg-icon
            slot=${ifDefined(slot)}
            .path=${mdiTextureBox}
          ></ha-svg-icon>`;

  private _renderDomainIcon =
    (domain: string) => (slot: string | undefined) => html`
      <img
        slot=${ifDefined(slot)}
        alt=""
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
        src=${brandsUrl({
          domain,
          type: "icon",
          darkOptimized: this.hass.themes?.darkMode,
        })}
      />
    `;

  private _renderEntityIcon =
    (stateObj: HassEntity) => (slot: string | undefined) =>
      html`<ha-state-icon
        .hass=${this.hass}
        slot=${ifDefined(slot)}
        .stateObj=${stateObj}
      ></ha-state-icon>`;

  private _renderItem(
    label: string,
    target: string,
    preventSelection = false,
    selected = false,
    lazy = false,
    open = false,
    icon?: (slot?: string) => TemplateResult,
    children?: TemplateResult | TemplateResult[] | typeof nothing
  ) {
    if (this.narrow) {
      return html`<ha-md-list-item
        interactive
        type="button"
        .target=${target}
        @click=${this._selectItem}
        .title=${label}
      >
        ${icon?.("start")}
        <div slot="headline">${label}</div>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-md-list-item>`;
    }

    return html`
      <wa-tree-item
        .preventSelection=${preventSelection}
        .target=${target}
        .selected=${selected}
        .lazy=${lazy}
        @wa-lazy-load=${this._expandItem}
        @wa-collapse=${this._collapseItem}
        .expanded=${open}
        .title=${label}
      >
        ${icon?.()} ${label} ${children || nothing}
      </wa-tree-item>
    `;
  }

  // #endregion render

  // #region memoized data helpers

  private _getAreaDeviceLookupMemoized = memoizeOne(
    (devices: HomeAssistant["devices"]) =>
      getAreaDeviceLookup(Object.values(devices))
  );

  private _getAreaEntityLookupMemoized = memoizeOne(
    (entities: HomeAssistant["entities"]) =>
      getAreaEntityLookup(Object.values(entities))
  );

  private _getDeviceEntityLookupMemoized = memoizeOne(
    (entities: HomeAssistant["entities"]) =>
      getDeviceEntityLookup(Object.values(entities))
  );

  private _getSelectedTargetId = memoizeOne(
    (value: SingleHassServiceTarget | undefined) =>
      value && Object.keys(value).length
        ? `${Object.keys(value)[0].replace("_id", "")}${TARGET_SEPARATOR}${Object.values(value)[0]}`
        : undefined
  );

  private _getLabelsMemoized = memoizeOne(getLabels);

  private _formatId = memoizeOne((value: AreaFloorValue): string =>
    [value.type, value.id].join(TARGET_SEPARATOR)
  );

  // #endregion memoized data helpers

  // #region data

  private _getTreeData() {
    this._floorAreas = getAreasNestedInFloors(
      this.states,
      this.floors,
      this.areas,
      this.devices,
      this.entities,
      this._formatId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );

    this._floorAreas.forEach((floor) => {
      this._entries[floor.id || `floor${TARGET_SEPARATOR}`] = {
        open: false,
        areas: {},
      };

      floor.areas.forEach((area) => {
        this._entries[floor.id || `floor${TARGET_SEPARATOR}`].areas![area.id] =
          this._loadArea(area);
      });
    });

    this._loadUnassignedDevices();
    this._loadUnassignedEntities();
    this._entries = { ...this._entries };

    if (this.value) {
      this._valueChanged(this._getSelectedTargetId(this.value)!, !this.narrow);
    }
  }

  private _loadUnassignedDevices() {
    const unassignedDevices = Object.values(this.devices).filter(
      (device) => !device.area_id
    );

    const devices: Record<string, Level3Entries> = {};

    const services: Record<string, Level3Entries> = {};

    unassignedDevices.forEach(({ id: deviceId, entry_type }) => {
      const device = this.devices[deviceId];
      if (!device || device.disabled_by) {
        return;
      }
      const deviceEntry = {
        open: false,
        entities:
          this._getDeviceEntityLookupMemoized(this.entities)[deviceId]?.map(
            (entity) => entity.entity_id
          ) || [],
      };
      if (entry_type === "service") {
        services[deviceId] = deviceEntry;
        return;
      }

      devices[deviceId] = deviceEntry;
    });

    if (Object.keys(devices).length) {
      this._entries = {
        ...this._entries,
        [`area${TARGET_SEPARATOR}`]: {
          open: false,
          devices,
        },
      };
    }

    if (Object.keys(services).length) {
      this._entries = {
        ...this._entries,
        [`service${TARGET_SEPARATOR}`]: {
          open: false,
          devices: services,
        },
      };
    }
  }

  private _loadUnassignedEntities() {
    Object.values(this.entities)
      .filter((entity) => !entity.area_id && !entity.device_id)
      .forEach(({ entity_id }) => {
        const domain = entity_id.split(".", 2)[0];
        const manifest = this.manifests ? this.manifests[domain] : undefined;
        if (manifest?.integration_type === "helper") {
          if (!this._entries[`helper${TARGET_SEPARATOR}`]) {
            this._entries[`helper${TARGET_SEPARATOR}`] = {
              open: false,
              devices: {},
            };
          }
          if (
            !this._entries[`helper${TARGET_SEPARATOR}`].devices![
              `helper_${domain}${TARGET_SEPARATOR}`
            ]
          ) {
            this._entries[`helper${TARGET_SEPARATOR}`].devices![
              `helper_${domain}${TARGET_SEPARATOR}`
            ] = {
              open: false,
              entities: [],
            };
          }
          this._entries[`helper${TARGET_SEPARATOR}`].devices![
            `helper_${domain}${TARGET_SEPARATOR}`
          ].entities.push(entity_id);
          return;
        }

        if (!this._entries[`device${TARGET_SEPARATOR}`]) {
          this._entries[`device${TARGET_SEPARATOR}`] = {
            open: false,
            devices: {},
          };
        }
        if (
          !this._entries[`device${TARGET_SEPARATOR}`].devices![
            `entity_${domain}${TARGET_SEPARATOR}`
          ]
        ) {
          this._entries[`device${TARGET_SEPARATOR}`].devices![
            `entity_${domain}${TARGET_SEPARATOR}`
          ] = {
            open: false,
            entities: [],
          };
        }
        this._entries[`device${TARGET_SEPARATOR}`].devices![
          `entity_${domain}${TARGET_SEPARATOR}`
        ].entities.push(entity_id);
      });
  }

  private _loadArea(area: FloorComboBoxItem) {
    const [, id] = area.id.split(TARGET_SEPARATOR, 2);
    const referenced_devices =
      this._getAreaDeviceLookupMemoized(this.devices)[id] || [];
    const referenced_entities =
      this._getAreaEntityLookupMemoized(this.entities)[id] || [];

    const devices: Record<string, Level3Entries> = {};

    referenced_devices.forEach(({ id: deviceId }) => {
      const device = this.devices[deviceId];
      if (!device || device.disabled_by) {
        return;
      }
      devices[deviceId] = {
        open: false,
        entities:
          this._getDeviceEntityLookupMemoized(this.entities)[deviceId]?.map(
            (entity) => entity.entity_id
          ) || [],
      };
    });

    const entities: string[] = [];

    referenced_entities.forEach((entity) => {
      if (!entity.device_id || !devices[entity.device_id]) {
        entities.push(entity.entity_id);
      }
    });

    return {
      open: false,
      devices,
      entities,
    };
  }

  private _expandTreeToItem(type: string, id: string) {
    if (type === "floor" || type === "label") {
      return;
    }

    if (type === "entity") {
      const deviceId = this.entities[id]?.device_id;
      const device = deviceId ? this.devices[deviceId] : undefined;
      const deviceAreaId = (deviceId && device?.area_id) || undefined;

      if (!deviceAreaId) {
        let floor: string;
        let area: string;
        const entity = this.entities[id];

        if (!deviceId && entity.area_id) {
          floor = `floor${TARGET_SEPARATOR}${this.areas[entity.area_id]?.floor_id || ""}`;
          area = `area${TARGET_SEPARATOR}${entity.area_id}`;
        } else if (!deviceId) {
          const domain = id.split(".", 1)[0];
          const isHelper =
            this.manifests![domain]?.integration_type === "helper";

          floor = isHelper
            ? `helper${TARGET_SEPARATOR}`
            : `device${TARGET_SEPARATOR}`;
          area = `${isHelper ? "helper_" : "entity_"}${domain}${TARGET_SEPARATOR}`;
        } else {
          floor = `${device!.entry_type === "service" ? "service" : "area"}${TARGET_SEPARATOR}`;
          area = deviceId;
        }
        this._entries = {
          ...this._entries,
          [floor]: {
            ...this._entries[floor],
            open: true,
            devices: {
              ...this._entries[floor].devices!,
              [area]: {
                ...this._entries[floor].devices![area],
                open: true,
              },
            },
          },
        };
        return;
      }

      const floor = `floor${TARGET_SEPARATOR}${this.areas[deviceAreaId]?.floor_id || ""}`;
      const area = `area${TARGET_SEPARATOR}${deviceAreaId}`;

      this._entries = {
        ...this._entries,
        [floor]: {
          ...this._entries[floor],
          open: true,
          areas: {
            ...this._entries[floor].areas!,
            [area]: {
              ...this._entries[floor].areas![area],
              open: true,
              devices: {
                ...this._entries[floor].areas![area].devices,
                [deviceId!]: {
                  ...this._entries[floor].areas![area].devices![deviceId!],
                  open: true,
                },
              },
            },
          },
        },
      };
      return;
    }

    if (type === "device") {
      const deviceAreaId = this.devices[id]?.area_id;

      if (!deviceAreaId) {
        const device = this.devices[id];
        const floor = `${device.entry_type === "service" ? "service" : "area"}${TARGET_SEPARATOR}`;
        this._entries = {
          ...this._entries,
          [floor]: {
            ...this._entries[floor],
            open: true,
          },
        };
        return;
      }

      const floor = `floor${TARGET_SEPARATOR}${this.areas[deviceAreaId]?.floor_id || ""}`;
      const area = `area${TARGET_SEPARATOR}${deviceAreaId}`;

      this._entries = {
        ...this._entries,
        [floor]: {
          ...this._entries[floor],
          open: true,
          areas: {
            ...this._entries[floor].areas!,
            [area]: {
              ...this._entries[floor].areas![area],
              open: true,
            },
          },
        },
      };
      return;
    }

    if (type === "area") {
      const floor = `floor${TARGET_SEPARATOR}${this.areas[id]?.floor_id || ""}`;
      this._entries = {
        ...this._entries,
        [floor]: {
          ...this._entries[floor],
          open: true,
        },
      };
    }
  }

  // #endregion data

  // #region interactions

  private _handleSelectionChange(ev: WaSelectionChangeEvent) {
    const treeItem = ev.detail.selection[0] as unknown as
      | { target?: string }
      | undefined;

    if (treeItem?.target) {
      this._valueChanged(treeItem.target);
    }
  }

  private _selectItem(ev: CustomEvent) {
    const target = (ev.currentTarget as any).target;

    if (target) {
      this._valueChanged(target);
    }
  }

  private async _valueChanged(itemId: string, expand = false) {
    const [type, id] = itemId.split(TARGET_SEPARATOR, 2);

    fireEvent(this, "value-changed", {
      value: { [`${type}_id`]: id || undefined },
    });

    if (expand && id) {
      this._expandTreeToItem(type, id);
      await this.updateComplete;
      if (type === "label") {
        this.shadowRoot!.querySelector(
          "ha-md-list-item.selected"
        )?.scrollIntoView({
          block: "center",
        });
      } else {
        this.shadowRoot!.querySelector(
          "wa-tree-item[selected]"
        )?.scrollIntoView({
          block: "center",
        });
      }
    }
  }

  private _toggleItem(targetId: string, open: boolean) {
    const [type, id] = targetId.split(TARGET_SEPARATOR, 2);

    if (type === "floor") {
      this._entries = {
        ...this._entries,
        [targetId]: {
          ...this._entries[targetId],
          open,
        },
      };
      return;
    }

    if (type === "area" && id) {
      const floorId = `floor${TARGET_SEPARATOR}${this.areas[id]?.floor_id || ""}`;

      this._entries = {
        ...this._entries,
        [floorId]: {
          ...this._entries[floorId],
          areas: {
            ...this._entries[floorId].areas,
            [targetId]: {
              ...this._entries[floorId].areas![targetId],
              open,
            },
          },
        },
      };
      return;
    }

    if (type === "area") {
      this._entries = {
        ...this._entries,
        [targetId]: {
          ...this._entries[targetId],
          open,
        },
      };
      return;
    }

    if (type === "service") {
      this._entries = {
        ...this._entries,
        [targetId]: {
          ...this._entries[targetId],
          open,
        },
      };
      return;
    }

    if (type === "device" && id) {
      const areaId = this.devices[id]?.area_id;
      if (areaId) {
        const areaTargetId = `area${TARGET_SEPARATOR}${this.devices[id]?.area_id ?? ""}`;
        const floorId = `floor${TARGET_SEPARATOR}${(areaId && this.areas[areaId]?.floor_id) || ""}`;

        this._entries = {
          ...this._entries,
          [floorId]: {
            ...this._entries[floorId],
            areas: {
              ...this._entries[floorId].areas,
              [areaTargetId]: {
                ...this._entries[floorId].areas![areaTargetId],
                devices: {
                  ...this._entries[floorId].areas![areaTargetId].devices,
                  [id]: {
                    ...this._entries[floorId].areas![areaTargetId].devices[id],
                    open,
                  },
                },
              },
            },
          },
        };
        return;
      }

      const deviceType =
        this.devices[id]?.entry_type === "service" ? "service" : "area";
      const floorId = `${deviceType}${TARGET_SEPARATOR}`;
      this._entries = {
        ...this._entries,
        [floorId]: {
          ...this._entries[floorId],
          devices: {
            ...this._entries[floorId].devices,
            [id]: {
              ...this._entries[floorId].devices![id],
              open,
            },
          },
        },
      };
      return;
    }

    // unassigned entities
    if (type === "device") {
      this._entries = {
        ...this._entries,
        [targetId]: {
          ...this._entries[targetId],
          open,
        },
      };
      return;
    }

    if (type === "helper") {
      this._entries = {
        ...this._entries,
        [targetId]: {
          ...this._entries[targetId],
          open,
        },
      };
      return;
    }

    if (type.startsWith("entity_")) {
      this._entries = {
        ...this._entries,
        [`device${TARGET_SEPARATOR}`]: {
          ...this._entries[`device${TARGET_SEPARATOR}`],
          devices: {
            ...this._entries[`device${TARGET_SEPARATOR}`].devices,
            [targetId]: {
              ...this._entries[`device${TARGET_SEPARATOR}`].devices![targetId],
              open,
            },
          },
        },
      };
      return;
    }

    if (type.startsWith("helper_")) {
      this._entries = {
        ...this._entries,
        [`helper${TARGET_SEPARATOR}`]: {
          ...this._entries[`helper${TARGET_SEPARATOR}`],
          devices: {
            ...this._entries[`helper${TARGET_SEPARATOR}`].devices,
            [targetId]: {
              ...this._entries[`helper${TARGET_SEPARATOR}`].devices![targetId],
              open,
            },
          },
        },
      };
    }
  }

  private _expandItem(ev) {
    const targetId = ev.target.target;
    this._toggleItem(targetId, true);
  }

  private _collapseItem(ev) {
    const targetId = ev.target.target;
    this._toggleItem(targetId, false);
  }

  private async _loadConfigEntries() {
    const configEntries = await getConfigEntries(this.hass);
    this._configEntryLookup = Object.fromEntries(
      configEntries.map((entry) => [entry.entry_id, entry])
    );
  }

  private _expandHeight() {
    this._fullHeight = true;
    this.style.setProperty("--max-height", "none");
  }

  // #endregion interactions

  // #region styles

  static styles = css`
    :host {
      --wa-color-neutral-fill-quiet: var(--ha-color-fill-primary-normal-active);
      position: relative;
    }

    ha-section-title {
      top: 0;
      position: sticky;
      z-index: 1;
    }

    wa-tree-item::part(item) {
      height: var(--ha-space-10);
      padding: var(--ha-space-1) var(--ha-space-3);
      cursor: pointer;
      border-inline-start: 0;
    }
    wa-tree-item::part(label) {
      gap: var(--ha-space-3);
      font-family: var(--ha-font-family-heading);
      font-weight: var(--ha-font-weight-medium);
      overflow: hidden;
    }
    ha-md-list-item {
      --md-list-item-label-text-weight: var(--ha-font-weight-medium);
      --md-list-item-label-text-font: var(--ha-font-family-heading);
    }

    .item-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    ha-svg-icon,
    ha-icon,
    ha-state-icon,
    ha-floor-icon {
      padding: var(--ha-space-1);
      color: var(--ha-color-on-neutral-quiet);
    }

    wa-tree-item::part(item):hover {
      background-color: var(--ha-color-fill-neutral-quiet-hover);
    }

    img {
      width: 24px;
      height: 24px;
      padding: var(--ha-space-1);
    }

    img.domain-icon {
      filter: grayscale(100%);
    }

    state-badge {
      width: 24px;
      height: 24px;
    }

    wa-tree-item[selected]::part(item):hover {
      background-color: var(--ha-color-fill-primary-normal-hover);
    }

    wa-tree-item::part(base).tree-item-selected .item {
      background-color: yellow;
    }

    ha-md-list {
      padding: 0;
      --md-list-item-leading-space: var(--ha-space-3);
      --md-list-item-trailing-space: var(--md-list-item-leading-space);
      --md-list-item-bottom-space: var(--ha-space-1);
      --md-list-item-top-space: var(--md-list-item-bottom-space);
      --md-list-item-supporting-text-font: var(--ha-font-size-s);
      --md-list-item-one-line-container-height: var(--ha-space-10);
    }

    ha-md-list-item.selected {
      background-color: var(--ha-color-fill-primary-normal-active);
      --md-list-item-label-text-color: var(--ha-color-on-primary-normal);
      --icon-primary-color: var(--ha-color-on-primary-normal);
    }

    wa-tree-item[selected],
    wa-tree-item[selected] > ha-svg-icon,
    wa-tree-item[selected] > ha-icon,
    wa-tree-item[selected] > ha-state-icon,
    wa-tree-item[selected] > ha-floor-icon,
    ha-md-list-item.selected ha-icon,
    ha-md-list-item.selected ha-svg-icon {
      color: var(--ha-color-on-primary-normal);
    }

    .targets-show-more {
      display: flex;
      justify-content: center;
      position: absolute;
      bottom: 0;
      width: 100%;
      padding-bottom: var(--ha-space-2);
      box-shadow: inset var(--ha-shadow-offset-x-lg)
        calc(var(--ha-shadow-offset-y-lg) * -1) var(--ha-shadow-blur-lg)
        var(--ha-shadow-spread-lg) var(--ha-color-shadow-light);
      z-index: 2;
    }

    @media all and (max-width: 870px), all and (max-height: 500px) {
      :host {
        max-height: var(--max-height, 50%);
        overflow: hidden;
      }
    }
  `;

  // #endregion styles
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-add-from-target": HaAutomationAddFromTarget;
  }
}
