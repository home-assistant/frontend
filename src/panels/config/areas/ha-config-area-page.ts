import "@material/mwc-button";
import "@material/mwc-list";
import { mdiDelete, mdiDotsVertical, mdiImagePlus, mdiPencil } from "@mdi/js";
import {
  HassEntity,
  UnsubscribeFunc,
} from "home-assistant-js-websocket/dist/types";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import { groupBy } from "../../../common/util/group-by";
import { afterNextRender } from "../../../common/util/render-status";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-next";
import {
  AreaRegistryEntry,
  deleteAreaRegistryEntry,
  subscribeAreaRegistry,
  updateAreaRegistryEntry,
} from "../../../data/area_registry";
import { AutomationEntity } from "../../../data/automation";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  sortDeviceRegistryByName,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import {
  computeEntityRegistryName,
  EntityRegistryEntry,
  sortEntityRegistryByName,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import { SceneEntity } from "../../../data/scene";
import { ScriptEntity } from "../../../data/script";
import { findRelated, RelatedResult } from "../../../data/search";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "../../logbook/ha-logbook";
import {
  loadAreaRegistryDetailDialog,
  showAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";
import "../../../components/ha-list-item";

declare type NameAndEntity<EntityType extends HassEntity> = {
  name: string;
  entity: EntityType;
};

@customElement("ha-config-area-page")
class HaConfigAreaPage extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public areaId!: string;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public showAdvanced!: boolean;

  @state() public _areas!: AreaRegistryEntry[];

  @state() public _devices!: DeviceRegistryEntry[];

  @state() public _entities!: EntityRegistryEntry[];

  @state() private _related?: RelatedResult;

  private _logbookTime = { recent: 86400 };

  private _area = memoizeOne(
    (
      areaId: string,
      areas: AreaRegistryEntry[]
    ): AreaRegistryEntry | undefined =>
      areas.find((area) => area.area_id === areaId)
  );

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

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    loadAreaRegistryDetailDialog();
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("areaId")) {
      this._findRelated();
    }
  }

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeAreaRegistry(this.hass.connection, (areas) => {
        this._areas = areas;
      }),
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._devices = entries;
      }),
      subscribeEntityRegistry(this.hass.connection, (entries) => {
        this._entities = entries;
      }),
    ];
  }

  protected render() {
    if (!this._areas || !this._devices || !this._entities) {
      return nothing;
    }

    const area = this._area(this.areaId, this._areas);

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
      this._devices,
      this._entities
    );
    const { devices, entities } = memberships;

    // Pre-compute the entity and device names, so we can sort by them
    if (devices) {
      devices.forEach((entry) => {
        entry.name = computeDeviceName(entry, this.hass);
      });
      sortDeviceRegistryByName(devices, this.hass.locale.language);
    }
    if (entities) {
      entities.forEach((entry) => {
        entry.name = computeEntityRegistryName(this.hass, entry);
      });
      sortEntityRegistryByName(entities, this.hass.locale.language);
    }

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

    if (isComponentLoaded(this.hass, "automation")) {
      ({
        groupedEntities: groupedAutomations,
        relatedEntities: relatedAutomations,
      } = this._prepareEntities<AutomationEntity>(
        groupedEntities.automation,
        this._related?.automation
      ));
    }

    if (isComponentLoaded(this.hass, "scene")) {
      ({ groupedEntities: groupedScenes, relatedEntities: relatedScenes } =
        this._prepareEntities<SceneEntity>(
          groupedEntities.scene,
          this._related?.scene
        ));
    }

    if (isComponentLoaded(this.hass, "script")) {
      ({ groupedEntities: groupedScripts, relatedEntities: relatedScripts } =
        this._prepareEntities<ScriptEntity>(
          groupedEntities.script,
          this._related?.script
        ));
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${area.name}
      >
        <ha-button-menu slot="toolbar-icon">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <mwc-list-item
            graphic="icon"
            .entry=${area}
            @click=${this._showSettings}
          >
            ${this.hass.localize("ui.panel.config.areas.edit_settings")}
            <ha-svg-icon slot="graphic" .path=${mdiPencil}> </ha-svg-icon>
          </mwc-list-item>

          <mwc-list-item
            class="warning"
            graphic="icon"
            @click=${this._deleteConfirm}
          >
            ${this.hass.localize("ui.panel.config.areas.editor.delete")}
            <ha-svg-icon class="warning" slot="graphic" .path=${mdiDelete}>
            </ha-svg-icon>
          </mwc-list-item>
        </ha-button-menu>

        <div class="container">
          <div class="column">
            ${area.picture
              ? html`<div class="img-container">
                  <img alt=${area.name} src=${area.picture} />
                  <ha-icon-button
                    .path=${mdiPencil}
                    .entry=${area}
                    @click=${this._showSettings}
                    .label=${this.hass.localize(
                      "ui.panel.config.areas.edit_settings"
                    )}
                    class="img-edit-btn"
                  ></ha-icon-button>
                </div>`
              : html`<mwc-button
                  .entry=${area}
                  @click=${this._showSettings}
                  .label=${this.hass.localize(
                    "ui.panel.config.areas.add_picture"
                  )}
                >
                  <ha-svg-icon .path=${mdiImagePlus} slot="icon"></ha-svg-icon>
                </mwc-button>`}
            <ha-card
              outlined
              .header=${this.hass.localize("ui.panel.config.devices.caption")}
              >${devices.length
                ? html`<mwc-list>
                    ${devices.map(
                      (device) => html`
                        <a href="/config/devices/device/${device.id}">
                          <ha-list-item hasMeta>
                            <span>${device.name}</span>
                            <ha-icon-next slot="meta"></ha-icon-next>
                          </ha-list-item>
                        </a>
                      `
                    )}
                  </mwc-list>`
                : html`
                    <div class="no-entries">
                      ${this.hass.localize(
                        "ui.panel.config.devices.no_devices"
                      )}
                    </div>
                  `}
            </ha-card>
            <ha-card
              outlined
              .header=${this.hass.localize(
                "ui.panel.config.areas.editor.linked_entities_caption"
              )}
            >
              ${entities.length
                ? html`<mwc-list>
                    ${entities.map((entity) =>
                      ["scene", "script", "automation"].includes(
                        computeDomain(entity.entity_id)
                      )
                        ? ""
                        : html`
                            <ha-list-item
                              @click=${this._openEntity}
                              .entity=${entity}
                              hasMeta
                            >
                              <span>${entity.name}</span>
                              <ha-icon-next slot="meta"></ha-icon-next>
                            </ha-list-item>
                          `
                    )}</mwc-list
                  >`
                : html`
                    <div class="no-entries">
                      ${this.hass.localize(
                        "ui.panel.config.areas.editor.no_linked_entities"
                      )}
                    </div>
                  `}
            </ha-card>
          </div>
          <div class="column">
            ${isComponentLoaded(this.hass, "automation")
              ? html`
                  <ha-card
                    outlined
                    .header=${this.hass.localize(
                      "ui.panel.config.devices.automation.automations_heading"
                    )}
                  >
                    ${groupedAutomations?.length
                      ? html`<h3>
                            ${this.hass.localize(
                              "ui.panel.config.areas.assigned_to_area"
                            )}:
                          </h3>
                          <mwc-list>
                            ${groupedAutomations.map((automation) =>
                              this._renderAutomation(
                                automation.name,
                                automation.entity
                              )
                            )}</mwc-list
                          >`
                      : ""}
                    ${relatedAutomations?.length
                      ? html`<h3>
                            ${this.hass.localize(
                              "ui.panel.config.areas.targeting_area"
                            )}:
                          </h3>
                          <mwc-list>
                            ${relatedAutomations.map((automation) =>
                              this._renderAutomation(
                                automation.name,
                                automation.entity
                              )
                            )}</mwc-list
                          >`
                      : ""}
                    ${!groupedAutomations?.length && !relatedAutomations?.length
                      ? html`
                          <div class="no-entries">
                            ${this.hass.localize(
                              "ui.panel.config.devices.automation.no_automations"
                            )}
                          </div>
                        `
                      : ""}
                  </ha-card>
                `
              : ""}
            ${isComponentLoaded(this.hass, "scene")
              ? html`
                  <ha-card
                    outlined
                    .header=${this.hass.localize(
                      "ui.panel.config.devices.scene.scenes_heading"
                    )}
                  >
                    ${groupedScenes?.length
                      ? html`<h3>
                            ${this.hass.localize(
                              "ui.panel.config.areas.assigned_to_area"
                            )}:
                          </h3>
                          <mwc-list>
                            ${groupedScenes.map((scene) =>
                              this._renderScene(scene.name, scene.entity)
                            )}</mwc-list
                          >`
                      : ""}
                    ${relatedScenes?.length
                      ? html`<h3>
                            ${this.hass.localize(
                              "ui.panel.config.areas.targeting_area"
                            )}:
                          </h3>
                          <mwc-list>
                            ${relatedScenes.map((scene) =>
                              this._renderScene(scene.name, scene.entity)
                            )}</mwc-list
                          >`
                      : ""}
                    ${!groupedScenes?.length && !relatedScenes?.length
                      ? html`
                          <div class="no-entries">
                            ${this.hass.localize(
                              "ui.panel.config.devices.scene.no_scenes"
                            )}
                          </div>
                        `
                      : ""}
                  </ha-card>
                `
              : ""}
            ${isComponentLoaded(this.hass, "script")
              ? html`
                  <ha-card
                    outlined
                    .header=${this.hass.localize(
                      "ui.panel.config.devices.script.scripts_heading"
                    )}
                  >
                    ${groupedScripts?.length
                      ? html`<h3>
                            ${this.hass.localize(
                              "ui.panel.config.areas.assigned_to_area"
                            )}:
                          </h3>
                          ${groupedScripts.map((script) =>
                            this._renderScript(script.name, script.entity)
                          )}`
                      : ""}
                    ${relatedScripts?.length
                      ? html`<h3>
                            ${this.hass.localize(
                              "ui.panel.config.areas.targeting_area"
                            )}:
                          </h3>
                          ${relatedScripts.map((script) =>
                            this._renderScript(script.name, script.entity)
                          )}`
                      : ""}
                    ${!groupedScripts?.length && !relatedScripts?.length
                      ? html`
                          <div class="no-entries">
                            ${this.hass.localize(
                              "ui.panel.config.devices.script.no_scripts"
                            )}
                          </div>
                        `
                      : ""}
                  </ha-card>
                `
              : ""}
          </div>
          <div class="column">
            ${isComponentLoaded(this.hass, "logbook")
              ? html`
                  <ha-card
                    outlined
                    .header=${this.hass.localize("panel.logbook")}
                  >
                    <ha-logbook
                      .hass=${this.hass}
                      .time=${this._logbookTime}
                      .entityIds=${this._allEntities(memberships)}
                      .deviceIds=${this._allDeviceIds(memberships.devices)}
                      virtualize
                      narrow
                      no-icon
                    ></ha-logbook>
                  </ha-card>
                `
              : ""}
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
            name: computeStateName(entityState),
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
            name: entityState ? computeStateName(entityState) : "",
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

  private _renderScene(name: string, entityState: SceneEntity) {
    return html`<div>
      <a
        href=${ifDefined(
          entityState.attributes.id
            ? `/config/scene/edit/${entityState.attributes.id}`
            : undefined
        )}
      >
        <ha-list-item .disabled=${!entityState.attributes.id} hasMeta>
          <span>${name}</span>
          <ha-icon-next slot="meta"></ha-icon-next>
        </ha-list-item>
      </a>
      ${!entityState.attributes.id
        ? html`
            <simple-tooltip animation-delay="0">
              ${this.hass.localize("ui.panel.config.devices.cant_edit")}
            </simple-tooltip>
          `
        : ""}
    </div>`;
  }

  private _renderAutomation(name: string, entityState: AutomationEntity) {
    return html`<div>
      <a
        href=${ifDefined(
          entityState.attributes.id
            ? `/config/automation/edit/${entityState.attributes.id}`
            : undefined
        )}
      >
        <ha-list-item .disabled=${!entityState.attributes.id} hasMeta>
          <span>${name}</span>
          <ha-icon-next slot="meta"></ha-icon-next>
        </ha-list-item>
      </a>
      ${!entityState.attributes.id
        ? html`
            <simple-tooltip animation-delay="0">
              ${this.hass.localize("ui.panel.config.devices.cant_edit")}
            </simple-tooltip>
          `
        : ""}
    </div>`;
  }

  private _renderScript(name: string, entityState: ScriptEntity) {
    const entry = this._entities.find(
      (e) => e.entity_id === entityState.entity_id
    );
    let url = `/config/script/show/${entityState.entity_id}`;
    if (entry) {
      url = `/config/script/edit/${entry.unique_id}`;
    }
    return html`<a href=${url}>
      <ha-list-item hasMeta>
        <span>${name}</span>
        <ha-icon-next slot="meta"></ha-icon-next>
      </ha-list-item>
    </a>`;
  }

  private async _findRelated() {
    this._related = await findRelated(this.hass, "area", this.areaId);
  }

  private _showSettings(ev: MouseEvent) {
    const entry: AreaRegistryEntry = (ev.currentTarget! as any).entry;
    this._openDialog(entry);
  }

  private _openEntity(ev) {
    const entry: EntityRegistryEntry = (ev.currentTarget as any).entity;
    showMoreInfoDialog(this, {
      entityId: entry.entity_id,
    });
  }

  private _openDialog(entry?: AreaRegistryEntry) {
    showAreaRegistryDetailDialog(this, {
      entry,
      updateEntry: async (values) =>
        updateAreaRegistryEntry(this.hass!, entry!.area_id, values),
    });
  }

  private async _deleteConfirm() {
    const area = this._area(this.areaId, this._areas);
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
        afterNextRender(() => history.back());
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
          font-weight: 500;
          color: var(--secondary-text-color);
        }

        img {
          border-radius: var(--ha-card-border-radius, 12px);
          width: 100%;
        }

        .container {
          display: flex;
          flex-wrap: wrap;
          margin: auto;
          max-width: 1000px;
          margin-top: 32px;
          margin-bottom: 32px;
        }
        .column {
          padding: 8px;
          box-sizing: border-box;
          width: 33%;
          flex-grow: 1;
        }
        .fullwidth {
          padding: 8px;
          width: 100%;
        }
        .column > *:not(:first-child) {
          margin-top: 16px;
        }

        :host([narrow]) .column {
          width: 100%;
        }

        :host([narrow]) .container {
          margin-top: 0;
        }

        a {
          text-decoration: none;
          color: var(--primary-text-color);
        }

        ha-card > a:first-child {
          display: block;
        }
        ha-card > *:first-child {
          margin-top: -16px;
        }
        .img-container {
          position: relative;
        }
        .img-edit-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          display: none;
        }
        .img-container:hover .img-edit-btn {
          display: block;
        }
        .img-edit-btn::before {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: var(--card-background-color);
          opacity: 0.5;
          border-radius: 50%;
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
