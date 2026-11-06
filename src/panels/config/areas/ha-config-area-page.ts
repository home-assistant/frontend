import {
  mdiDelete,
  mdiDevices,
  mdiDotsVertical,
  mdiImagePlus,
  mdiPalette,
  mdiPencil,
  mdiPlus,
  mdiRobot,
  mdiScriptText,
  mdiShape,
  mdiTextureBox,
  mdiTools,
  mdiTransitConnectionVariant,
} from "@mdi/js";
import { startOfYesterday } from "date-fns";
import type { HassEntity } from "home-assistant-js-websocket/dist/types";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { consume } from "../../../common/decorators/consume";
import { transform } from "../../../common/decorators/transform";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../common/entity/compute_device_name";
import { computeDomain } from "../../../common/entity/compute_domain";
import { goBack, navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import { slugify } from "../../../common/string/slugify";
import { createSearchParam } from "../../../common/url/search-params";
import { groupBy } from "../../../common/util/group-by";
import { afterNextRender } from "../../../common/util/render-status";
import { createColumnsController } from "../../../common/util/responsive-columns";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-domain-icon";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-next";
import "../../../components/ha-icon-next";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import "../../../components/item/ha-list-item-base";
import "../../../components/item/ha-list-item-button";
import "../../../components/list/ha-list-base";
import "../../../components/list/ha-list-nav";
import type { AreaRegistryEntry } from "../../../data/area/area_registry";
import {
  deleteAreaRegistryEntry,
  updateAreaRegistryEntry,
} from "../../../data/area/area_registry";
import type { AutomationEntity } from "../../../data/automation";
import type { ConfigEntry } from "../../../data/config_entries";
import {
  brandsAccessTokenContext,
  configEntriesContext,
  fireRelatedContext,
  fullEntitiesContext,
} from "../../../data/context";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import { sortDeviceRegistryByName } from "../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import {
  computeEntityRegistryName,
  sortEntityRegistryByName,
} from "../../../data/entity/entity_registry";
import type { SceneEntity } from "../../../data/scene";
import type { ScriptEntity } from "../../../data/script";
import type { RelatedResult } from "../../../data/search";
import { findRelated } from "../../../data/search";
import { filterAddToSceneEntityIds } from "../../../dialogs/add-to/add-to";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import "../../logbook/ha-logbook";
import { isHelperDomain } from "../helpers/const";
import {
  loadAreaAddToDialog,
  showAreaAddToDialog,
} from "./show-dialog-area-add-to";
import {
  loadAreaRegistryDetailDialog,
  showAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";

declare interface NameAndEntity<EntityType extends HassEntity> {
  name: string;
  entity: EntityType;
}

type AreaQuickLinkKey =
  "devices" | "entities" | "helpers" | "automations" | "scenes" | "scripts";

const NAVIGATION_ACTIONS: {
  value: string;
  path: string;
  params?: string;
  icon: string;
  countKey: AreaQuickLinkKey;
}[] = [
  {
    value: "navigate-devices",
    path: "/config/devices/dashboard",
    params: "&status=disabled",
    icon: mdiDevices,
    countKey: "devices",
  },
  {
    value: "navigate-entities",
    path: "/config/entities",
    icon: mdiShape,
    countKey: "entities",
  },
  {
    value: "navigate-helpers",
    path: "/config/helpers",
    icon: mdiTools,
    countKey: "helpers",
  },
  {
    value: "navigate-automations",
    path: "/config/automation/dashboard",
    icon: mdiRobot,
    countKey: "automations",
  },
  {
    value: "navigate-scenes",
    path: "/config/scene/dashboard",
    icon: mdiPalette,
    countKey: "scenes",
  },
  {
    value: "navigate-scripts",
    path: "/config/script/dashboard",
    icon: mdiScriptText,
    countKey: "scripts",
  },
] as const;

const MAX_COLUMNS = 3;

@customElement("ha-config-area-page")
class HaConfigAreaPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public areaId!: string;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg: EntityRegistryEntry[] = [];

  // Integration domain per config entry ID, to show the brand icon of a device
  @state()
  @consume({ context: configEntriesContext, subscribe: true })
  @transform<ConfigEntry[], Record<string, string>>({
    transformer: (entries) =>
      entries
        ? Object.fromEntries(
            entries.map((entry) => [entry.entry_id, entry.domain])
          )
        : undefined,
  })
  private _configEntryDomains?: Record<string, string>;

  @state()
  @consume({ context: brandsAccessTokenContext, subscribe: true })
  // @ts-ignore re-render trigger only, its value is never read
  private _brandsAccessToken?: string;

  @state() private _related?: RelatedResult;

  private _logbookTime = { recent: 86400 };

  private _columnsController = createColumnsController(this, MAX_COLUMNS);

  private _memberships = memoizeOne(
    (
      areaId: string,
      registryDevices: DeviceRegistryEntry[],
      registryEntities: EntityRegistryEntry[]
    ) => {
      const devices = new Map<string, DeviceRegistryEntry>();

      for (const device of registryDevices) {
        if (device.area_id === areaId) {
          devices.set(device.id, device);
        }
      }

      const entities: EntityRegistryEntry[] = [];
      const indirectEntities: EntityRegistryEntry[] = [];

      for (const entity of registryEntities) {
        if (entity.area_id) {
          if (entity.area_id === areaId) {
            entities.push(entity);
          }
        } else if (entity.device_id && devices.has(entity.device_id)) {
          indirectEntities.push(entity);
        }
      }

      return {
        devices: Array.from(devices.values()),
        entities,
        indirectEntities,
      };
    }
  );

  private _allDeviceIds = memoizeOne((devices: DeviceRegistryEntry[]) =>
    devices.map((device) => device.id)
  );

  private _allEntities = memoizeOne(
    (memberships: {
      entities: EntityRegistryEntry[];
      indirectEntities: EntityRegistryEntry[];
    }) =>
      memberships.entities
        .map((entry) => entry.entity_id)
        .concat(memberships.indirectEntities.map((entry) => entry.entity_id))
  );

  private _getQuickLinkCounts = memoizeOne(
    (
      memberships: {
        devices: DeviceRegistryEntry[];
        entities: EntityRegistryEntry[];
        indirectEntities: EntityRegistryEntry[];
      },
      related?: RelatedResult
    ) => {
      const allEntityIds = this._allEntities(memberships);
      const entityIds = related?.entity ?? allEntityIds;

      return {
        devices: related?.device?.length ?? memberships.devices.length,
        entities: entityIds.length,
        helpers: entityIds.filter((entityId) =>
          isHelperDomain(computeDomain(entityId))
        ).length,
        automations: related?.automation?.length ?? 0,
        scenes: related?.scene?.length ?? 0,
        scripts: related?.script?.length ?? 0,
      };
    }
  );

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    loadAreaRegistryDetailDialog();
    loadAreaAddToDialog();
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (changedProps.has("areaId")) {
      this._findRelated();
      fireRelatedContext(this, {
        itemType: "area",
        itemId: this.areaId,
      });
    }
  }

  protected render() {
    if (!this.hass.areas || !this.hass.devices || !this.hass.entities) {
      return nothing;
    }

    const area = this.hass.areas[this.areaId];

    if (!area) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this.hass.localize("ui.panel.config.areas.area_not_found")}
        ></hass-error-screen>
      `;
    }

    const memberships = this._memberships(
      this.areaId,
      Object.values(this.hass.devices),
      this._entityReg
    );
    const quickLinkCounts = this._getQuickLinkCounts(
      memberships,
      this._related
    );

    // Compute the display names on shallow copies so we can sort and render by
    // them without mutating the shared registry objects.
    const devices = memberships.devices.map((entry) => ({
      ...entry,
      name: computeDeviceNameDisplay(entry, this.hass.localize),
    }));
    sortDeviceRegistryByName(devices, this.hass.locale.language);

    const entities = memberships.entities.map((entry) => ({
      ...entry,
      name: computeEntityRegistryName(this.hass, entry),
    }));
    sortEntityRegistryByName(entities, this.hass.locale.language);

    // Group entities by domain
    const groupedEntities = groupBy(entities, (entity) =>
      computeDomain(entity.entity_id)
    );

    // Pre-compute the name also for the grouped and related entities so we can sort by them
    let groupedAutomations: NameAndEntity<AutomationEntity>[] = [];
    let groupedScenes: NameAndEntity<SceneEntity>[] = [];
    let groupedScripts: NameAndEntity<ScriptEntity>[] = [];
    let relatedAutomations: NameAndEntity<AutomationEntity>[] = [];
    let relatedScenes: NameAndEntity<SceneEntity>[] = [];
    let relatedScripts: NameAndEntity<ScriptEntity>[] = [];

    if (isComponentLoaded(this.hass.config, "automation")) {
      ({
        groupedEntities: groupedAutomations,
        relatedEntities: relatedAutomations,
      } = this._prepareEntities<AutomationEntity>(
        groupedEntities.automation,
        this._related?.automation
      ));
    }

    if (isComponentLoaded(this.hass.config, "scene")) {
      ({ groupedEntities: groupedScenes, relatedEntities: relatedScenes } =
        this._prepareEntities<SceneEntity>(
          groupedEntities.scene,
          this._related?.scene
        ));
    }

    if (isComponentLoaded(this.hass.config, "script")) {
      ({ groupedEntities: groupedScripts, relatedEntities: relatedScripts } =
        this._prepareEntities<ScriptEntity>(
          groupedEntities.script,
          this._related?.script
        ));
    }

    const nonAutomatedEntities = entities.filter(
      (entity) =>
        !["scene", "script", "automation"].includes(
          computeDomain(entity.entity_id)
        )
    );

    const header = html`
      <ha-card outlined class="area-header">
        <div class="card-content area-header-content">
          <div class="area-media">
            ${
              area.picture
                ? html`<img alt=${area.name} src=${area.picture} />`
                : html`<div class="area-media-placeholder">
                    ${
                      area.icon
                        ? html`<ha-icon .icon=${area.icon}></ha-icon>`
                        : html`<ha-svg-icon
                            .path=${mdiTextureBox}
                          ></ha-svg-icon>`
                    }
                  </div>`
            }
          </div>
          <div class="area-info">
            <h1 class="area-name">${area.name}</h1>
            <div class="area-summary">
              ${this.hass.localize(
                "ui.panel.config.areas.quick_links.devices",
                { count: quickLinkCounts.devices }
              )}
              ·
              ${this.hass.localize(
                "ui.panel.config.areas.quick_links.entities",
                { count: quickLinkCounts.entities }
              )}
            </div>
          </div>
          <div class="area-actions">
            <ha-button
              appearance=${area.picture ? "plain" : "filled"}
              .entry=${area}
              @click=${this._showSettings}
            >
              <ha-svg-icon
                slot="start"
                .path=${area.picture ? mdiPencil : mdiImagePlus}
              ></ha-svg-icon>
              ${this.hass.localize(
                area.picture
                  ? "ui.panel.config.areas.edit_picture"
                  : "ui.panel.config.areas.add_picture"
              )}
            </ha-button>
            <ha-button
              appearance="filled"
              variant="brand"
              @click=${this._showAddToDialog}
            >
              <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
              ${this.hass.localize("ui.dialogs.more_info_control.add_to.item")}
            </ha-button>
          </div>
        </div>
      </ha-card>
    `;

    const infoColumn = html`
      <ha-card
        outlined
        .header=${this.hass.localize("ui.panel.config.devices.caption")}
        >${
          devices.length
            ? html`<ha-list-nav
                .ariaLabel=${this.hass.localize(
                  "ui.panel.config.devices.caption"
                )}
              >
                ${devices.map(
                  (device) => html`
                    <ha-list-item-button
                      .href=${`/config/devices/device/${device.id}`}
                      .headline=${device.name}
                    >
                      ${this._renderDeviceIcon(device)}
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-list-item-button>
                  `
                )}
              </ha-list-nav>`
            : html`
                <div class="no-entries">
                  ${this.hass.localize("ui.panel.config.devices.no_devices")}
                </div>
              `
        }
      </ha-card>
      <ha-card
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.areas.editor.linked_entities_caption"
        )}
      >
        ${
          nonAutomatedEntities.length
            ? html`<ha-list-base
                aria-label=${this.hass.localize(
                  "ui.panel.config.areas.editor.linked_entities_caption"
                )}
              >
                ${nonAutomatedEntities.map(
                  (entity) => html`
                    <ha-list-item-button
                      @click=${this._openEntity}
                      .entity=${entity}
                      .headline=${entity.name ?? undefined}
                    >
                      ${this._renderEntityIcon(entity)}
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-list-item-button>
                  `
                )}
              </ha-list-base>`
            : html`
                <div class="no-entries">
                  ${this.hass.localize(
                    "ui.panel.config.areas.editor.no_linked_entities"
                  )}
                </div>
              `
        }
      </ha-card>
    `;

    const relatedColumn = html`
      ${
        isComponentLoaded(this.hass.config, "automation")
          ? html`
              <ha-card
                outlined
                .header=${this.hass.localize(
                  "ui.panel.config.devices.automation.automations_heading"
                )}
              >
                ${
                  groupedAutomations?.length
                    ? html`<h3>
                          ${this.hass.localize(
                            "ui.panel.config.areas.assigned_to_area"
                          )}:
                        </h3>
                        <ha-list-nav
                          .ariaLabel=${this.hass.localize(
                            "ui.panel.config.areas.related_lists.automations_assigned",
                            { area: area.name }
                          )}
                        >
                          ${groupedAutomations.map((automation) =>
                            this._renderAutomation(
                              automation.name,
                              automation.entity
                            )
                          )}
                        </ha-list-nav>`
                    : ""
                }
                ${
                  relatedAutomations?.length
                    ? html`<h3>
                          ${this.hass.localize(
                            "ui.panel.config.areas.targeting_area"
                          )}:
                        </h3>
                        <ha-list-nav
                          .ariaLabel=${this.hass.localize(
                            "ui.panel.config.areas.related_lists.automations_targeting",
                            { area: area.name }
                          )}
                        >
                          ${relatedAutomations.map((automation) =>
                            this._renderAutomation(
                              automation.name,
                              automation.entity
                            )
                          )}
                        </ha-list-nav>`
                    : ""
                }
                ${
                  !groupedAutomations?.length && !relatedAutomations?.length
                    ? html`
                        <div class="no-entries">
                          ${this.hass.localize(
                            "ui.panel.config.devices.automation.no_automations"
                          )}
                        </div>
                      `
                    : ""
                }
              </ha-card>
            `
          : ""
      }
      ${
        isComponentLoaded(this.hass.config, "scene")
          ? html`
              <ha-card
                outlined
                .header=${this.hass.localize(
                  "ui.panel.config.devices.scene.scenes_heading"
                )}
              >
                ${
                  groupedScenes?.length
                    ? html`<h3>
                          ${this.hass.localize(
                            "ui.panel.config.areas.assigned_to_area"
                          )}:
                        </h3>
                        <ha-list-nav
                          .ariaLabel=${this.hass.localize(
                            "ui.panel.config.areas.related_lists.scenes_assigned",
                            { area: area.name }
                          )}
                        >
                          ${groupedScenes.map((scene) =>
                            this._renderScene(scene.name, scene.entity)
                          )}
                        </ha-list-nav>`
                    : ""
                }
                ${
                  relatedScenes?.length
                    ? html`<h3>
                          ${this.hass.localize(
                            "ui.panel.config.areas.targeting_area"
                          )}:
                        </h3>
                        <ha-list-nav
                          .ariaLabel=${this.hass.localize(
                            "ui.panel.config.areas.related_lists.scenes_targeting",
                            { area: area.name }
                          )}
                        >
                          ${relatedScenes.map((scene) =>
                            this._renderScene(scene.name, scene.entity)
                          )}
                        </ha-list-nav>`
                    : ""
                }
                ${
                  !groupedScenes?.length && !relatedScenes?.length
                    ? html`
                        <div class="no-entries">
                          ${this.hass.localize(
                            "ui.panel.config.devices.scene.no_scenes"
                          )}
                        </div>
                      `
                    : ""
                }
              </ha-card>
            `
          : ""
      }
      ${
        isComponentLoaded(this.hass.config, "script")
          ? html`
              <ha-card
                outlined
                .header=${this.hass.localize(
                  "ui.panel.config.devices.script.scripts_heading"
                )}
              >
                ${
                  groupedScripts?.length
                    ? html`<h3>
                          ${this.hass.localize(
                            "ui.panel.config.areas.assigned_to_area"
                          )}:
                        </h3>
                        <ha-list-nav
                          .ariaLabel=${this.hass.localize(
                            "ui.panel.config.areas.related_lists.scripts_assigned",
                            { area: area.name }
                          )}
                        >
                          ${groupedScripts.map((script) =>
                            this._renderScript(script.name, script.entity)
                          )}
                        </ha-list-nav>`
                    : ""
                }
                ${
                  relatedScripts?.length
                    ? html`<h3>
                          ${this.hass.localize(
                            "ui.panel.config.areas.targeting_area"
                          )}:
                        </h3>
                        <ha-list-nav
                          .ariaLabel=${this.hass.localize(
                            "ui.panel.config.areas.related_lists.scripts_targeting",
                            { area: area.name }
                          )}
                        >
                          ${relatedScripts.map((script) =>
                            this._renderScript(script.name, script.entity)
                          )}
                        </ha-list-nav>`
                    : ""
                }
                ${
                  !groupedScripts?.length && !relatedScripts?.length
                    ? html`
                        <div class="no-entries">
                          ${this.hass.localize(
                            "ui.panel.config.devices.script.no_scripts"
                          )}
                        </div>
                      `
                    : ""
                }
              </ha-card>
            `
          : ""
      }
    `;

    const logbookColumn = html`
      ${
        isComponentLoaded(this.hass.config, "logbook")
          ? html`
              <ha-card outlined>
                <div class="card-header logbook-header">
                  <span>${this.hass.localize("panel.logbook")}</span>
                  <a
                    href="/logbook?${createSearchParam({
                      area_id: this.areaId,
                      start_date: startOfYesterday().toISOString(),
                      back: "1",
                    })}"
                  >
                    <ha-icon-button-next
                      .label=${this.hass.localize(
                        "ui.dialogs.more_info_control.show_more"
                      )}
                    ></ha-icon-button-next>
                  </a>
                </div>
                <ha-logbook
                  .hass=${this.hass}
                  .time=${this._logbookTime}
                  .entityIds=${this._allEntities(memberships)}
                  .deviceIds=${this._allDeviceIds(memberships.devices)}
                  name-detail="device"
                  virtualize
                  narrow
                  no-icon
                ></ha-logbook>
              </ha-card>
            `
          : ""
      }
    `;

    // In 2 columns the logbook goes on the right, under the shorter
    // automations/scenes/scripts column, to balance the column heights.
    const columns =
      this._columnsController.value ?? (this.narrow ? 1 : MAX_COLUMNS);

    const columnContents =
      columns >= 3
        ? [[infoColumn], [relatedColumn], [logbookColumn]]
        : columns === 2
          ? [[infoColumn], [relatedColumn, logbookColumn]]
          : [[infoColumn, relatedColumn, logbookColumn]];

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config/areas/dashboard"
        .header=${html`${
          area.icon
            ? html`<ha-icon
                .icon=${area.icon}
                style="margin-inline-end: 8px;"
              ></ha-icon>`
            : nothing
        }${area.name}`}
      >
        <ha-dropdown slot="toolbar-icon" @wa-select=${this._handleMenuAction}>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          ${NAVIGATION_ACTIONS.filter(
            (action) => quickLinkCounts[action.countKey]
          ).map(
            (action) => html`
              <ha-dropdown-item value=${action.value}>
                <ha-svg-icon slot="icon" .path=${action.icon}></ha-svg-icon>
                ${this.hass.localize(
                  `ui.panel.config.areas.quick_links.${action.countKey}`,
                  { count: quickLinkCounts[action.countKey] }
                )}
                <ha-icon-next slot="details"></ha-icon-next>
              </ha-dropdown-item>
            `
          )}
          ${
            NAVIGATION_ACTIONS.some(
              (action) => quickLinkCounts[action.countKey]
            )
              ? html`<wa-divider></wa-divider>`
              : nothing
          }

          <ha-dropdown-item value="edit" .data=${area}>
            <ha-svg-icon slot="icon" .path=${mdiPencil}> </ha-svg-icon>
            ${this.hass.localize("ui.panel.config.areas.edit_settings")}
          </ha-dropdown-item>

          <ha-dropdown-item value="delete" variant="danger">
            <ha-svg-icon slot="icon" .path=${mdiDelete}> </ha-svg-icon>
            ${this.hass.localize("ui.panel.config.areas.editor.delete")}
          </ha-dropdown-item>
        </ha-dropdown>

        <div class="content">
          ${header}
          <div class="container" ${this._columnsController.target()}>
            ${columnContents.map(
              (contents) => html`<div class="column">${contents}</div>`
            )}
          </div>
        </div>
      </hass-subpage>
    `;
  }

  private _prepareEntities<EntityType extends HassEntity>(
    entries?: EntityRegistryEntry[],
    relatedEntityIds?: string[]
  ): {
    groupedEntities: NameAndEntity<EntityType>[];
    relatedEntities: NameAndEntity<EntityType>[];
  } {
    const groupedEntities: NameAndEntity<EntityType>[] = [];
    const relatedEntities: NameAndEntity<EntityType>[] = [];

    if (entries?.length) {
      entries.forEach((entity) => {
        const entityState = this.hass.states[
          entity.entity_id
        ] as unknown as EntityType;
        if (entityState) {
          groupedEntities.push({
            name: this.hass.formatEntityName(entityState),
            entity: entityState,
          });
        }
      });
      groupedEntities.sort((entry1, entry2) =>
        caseInsensitiveStringCompare(
          entry1.name!,
          entry2.name!,
          this.hass.locale.language
        )
      );
    }
    if (relatedEntityIds?.length) {
      relatedEntityIds.forEach((entity) => {
        const entityState = this.hass.states[entity] as EntityType;
        if (entityState) {
          relatedEntities.push({
            name: this.hass.formatEntityName(entityState),
            entity: entityState,
          });
        }
      });
      relatedEntities.sort((entry1, entry2) =>
        caseInsensitiveStringCompare(
          entry1.name!,
          entry2.name!,
          this.hass.locale.language
        )
      );
    }

    return { groupedEntities, relatedEntities };
  }

  private _renderDeviceIcon(device: DeviceRegistryEntry) {
    const entryIds = device.primary_config_entry
      ? [device.primary_config_entry, ...device.config_entries]
      : device.config_entries;
    const domain = entryIds
      .map((entryId) => this._configEntryDomains?.[entryId])
      .find(Boolean);

    if (!domain) {
      return html`<ha-svg-icon
        slot="start"
        .path=${
          device.entry_type === "service"
            ? mdiTransitConnectionVariant
            : mdiDevices
        }
      ></ha-svg-icon>`;
    }

    return html`<img
      slot="start"
      alt=""
      crossorigin="anonymous"
      referrerpolicy="no-referrer"
      src=${brandsUrl(
        {
          domain,
          type: "icon",
          darkOptimized: this.hass.themes?.darkMode,
        },
        this.hass.auth.data.hassUrl
      )}
      @error=${this._onImageError}
      @load=${this._onImageLoad}
    />`;
  }

  private _renderEntityIcon(entity: EntityRegistryEntry) {
    const stateObj = this.hass.states[entity.entity_id];
    return stateObj
      ? html`<ha-state-icon slot="start" .stateObj=${stateObj}></ha-state-icon>`
      : html`<ha-domain-icon
          slot="start"
          .domain=${computeDomain(entity.entity_id)}
          .icon=${entity.icon ?? undefined}
        ></ha-domain-icon>`;
  }

  // Keep the space of a brand icon that failed to load so the rows stay aligned
  private _onImageError(ev: HASSDomCurrentTargetEvent<HTMLImageElement>) {
    ev.currentTarget.style.visibility = "hidden";
  }

  private _onImageLoad(ev: HASSDomCurrentTargetEvent<HTMLImageElement>) {
    ev.currentTarget.style.visibility = "";
  }

  private _renderScene(name: string, entityState: SceneEntity) {
    return entityState.attributes.id
      ? this._renderLink(
          name,
          entityState,
          `/config/scene/edit/${entityState.attributes.id}`
        )
      : this._renderNotEditable(
          name,
          entityState,
          `scene-${slugify(entityState.entity_id)}`
        );
  }

  private _renderAutomation(name: string, entityState: AutomationEntity) {
    return entityState.attributes.id
      ? this._renderLink(
          name,
          entityState,
          `/config/automation/edit/${encodeURIComponent(entityState.attributes.id)}`
        )
      : this._renderNotEditable(
          name,
          entityState,
          `automation-${slugify(entityState.entity_id)}`
        );
  }

  private _renderLink(name: string, entityState: HassEntity, href: string) {
    return html`<ha-list-item-button .href=${href} .headline=${name}>
      <ha-state-icon slot="start" .stateObj=${entityState}></ha-state-icon>
      <ha-icon-next slot="end"></ha-icon-next>
    </ha-list-item-button>`;
  }

  private _renderNotEditable(
    name: string,
    entityState: HassEntity,
    id: string
  ) {
    return html`<ha-list-item-base id=${id} .headline=${name}>
        <ha-state-icon slot="start" .stateObj=${entityState}></ha-state-icon>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-base>
      <ha-tooltip .for=${id} .distance=${-4}>
        ${this.hass.localize("ui.panel.config.devices.cant_edit")}
      </ha-tooltip>`;
  }

  private _renderScript(name: string, entityState: ScriptEntity) {
    const entry = this._entityReg.find(
      (e) => e.entity_id === entityState.entity_id
    );
    let url = `/config/script/show/${entityState.entity_id}`;
    if (entry) {
      url = `/config/script/edit/${entry.unique_id}`;
    }
    return this._renderLink(name, entityState, url);
  }

  private async _findRelated() {
    this._related = await findRelated(this.hass, "area", this.areaId);
  }

  private _showAddToDialog() {
    const area = this.hass.areas[this.areaId];
    if (!area) {
      return;
    }
    const sceneEntityIds = filterAddToSceneEntityIds(
      this._areaEntityIds,
      this._entityReg,
      this.hass.states
    );
    showAreaAddToDialog(this, {
      areaId: area.area_id,
      entityIds: sceneEntityIds,
      canCreateScene:
        isComponentLoaded(this.hass.config, "scene") &&
        sceneEntityIds.length > 0,
    });
  }

  private get _areaEntityIds(): string[] {
    const memberships = this._memberships(
      this.areaId,
      Object.values(this.hass.devices),
      this._entityReg
    );

    return this._allEntities(memberships);
  }

  private _handleMenuAction(
    ev: HaDropdownSelectEvent<string, AreaRegistryEntry>
  ) {
    const action = ev.detail?.item?.value;
    const entry = ev.detail?.item?.data;

    const navAction = NAVIGATION_ACTIONS.find((a) => a.value === action);
    if (navAction) {
      navigate(
        `${navAction.path}?historyBack=1&area=${this.areaId}${navAction.params ?? ""}`
      );
      return;
    }

    switch (action) {
      case "edit":
        this._openDialog(entry);
        break;
      case "delete":
        this._deleteConfirm();
        break;
    }
  }

  private _showSettings(
    ev: HASSDomCurrentTargetEvent<
      HTMLButtonElement & { entry: AreaRegistryEntry }
    >
  ) {
    this._openDialog(ev.currentTarget.entry);
  }

  private _openEntity(
    ev: HASSDomCurrentTargetEvent<HTMLElement & { entity: EntityRegistryEntry }>
  ) {
    showMoreInfoDialog(this, {
      entityId: ev.currentTarget.entity.entity_id,
    });
  }

  private _openDialog(entry?: AreaRegistryEntry) {
    showAreaRegistryDetailDialog(this, {
      entry,
      updateEntry: async (values) =>
        updateAreaRegistryEntry(this.hass!.callWS, entry!.area_id, values),
    });
  }

  private async _deleteConfirm() {
    const area = this.hass.areas[this.areaId];
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.areas.delete.confirmation_title",
        { name: area!.name }
      ),
      text: this.hass.localize(
        "ui.panel.config.areas.delete.confirmation_text"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
      confirm: async () => {
        await deleteAreaRegistryEntry(this.hass!, area!.area_id);
        afterNextRender(() => goBack("/config/areas/dashboard"));
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        h3 {
          margin: 0;
          padding: 0 16px;
          font-weight: var(--ha-font-weight-medium);
          color: var(--secondary-text-color);
        }

        :host {
          display: block;
          height: 100%;
        }
        /* Spaced like the Marketplace repository page: 16px below the toolbar
           and one card gap between the header card and the columns. */
        .content {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          margin: auto;
          padding: var(--ha-space-4) var(--ha-content-gutter);
          max-width: var(--ha-content-width-wide);
        }
        .container {
          display: flex;
          flex-wrap: wrap;
          gap: var(--ha-space-4);
        }

        /* The actions move to their own row when the name would get too
           narrow, for example with long translated labels. */
        .area-header-content {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--ha-space-4);
        }
        .area-media {
          flex: none;
          width: 160px;
          aspect-ratio: 16 / 10;
          border-radius: var(--ha-border-radius-lg);
          overflow: hidden;
          background-color: var(--secondary-background-color);
        }
        .area-media img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .area-media-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: var(--secondary-text-color);
          --mdc-icon-size: 40px;
        }
        .area-info {
          flex: 1 1 200px;
          min-width: 0;
        }
        .area-name {
          margin: 0;
          font-size: var(--ha-font-size-2xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          overflow-wrap: anywhere;
        }
        .area-summary {
          margin-top: var(--ha-space-1);
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-m);
        }
        .area-actions {
          flex: none;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: var(--ha-space-2);
          margin-inline-start: auto;
        }

        :host([narrow]) .area-media {
          width: 96px;
        }
        :host([narrow]) .area-actions {
          flex-basis: 100%;
          justify-content: flex-start;
        }
        .column {
          box-sizing: border-box;
          flex: 1 1 0;
          min-width: 0;
        }
        .fullwidth {
          padding: var(--ha-space-2);
          width: 100%;
        }
        .column > *:not(:first-child) {
          margin-top: var(--ha-space-4);
        }

        a {
          text-decoration: none;
          color: var(--primary-text-color);
        }

        ha-list-base,
        ha-list-nav {
          --ha-list-padding: var(--ha-space-2) 0;
        }
        ha-list-item-base {
          color: var(--disabled-text-color);
        }
        ha-list-item-button ha-icon-next {
          color: var(--secondary-text-color);
        }
        img[slot="start"] {
          width: 24px;
          height: 24px;
          object-fit: contain;
          border-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
        }
        ha-card:not(.area-header) > *:first-child {
          margin-top: -16px;
        }
        .logbook-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--ha-space-4) var(--ha-space-4) 0;
        }

        .logbook-header a {
          display: flex;
          align-items: center;
          color: var(--primary-text-color);
          margin-right: calc(var(--ha-space-2) * -1);
          margin-inline-end: calc(var(--ha-space-2) * -1);
          margin-inline-start: initial;
        }

        ha-logbook {
          height: 400px;
        }
        :host([narrow]) ha-logbook {
          height: 235px;
          overflow: auto;
        }
        .no-entries {
          text-align: center;
          padding: 16px;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-area-page": HaConfigAreaPage;
  }
}
