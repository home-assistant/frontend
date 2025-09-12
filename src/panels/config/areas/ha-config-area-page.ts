import { consume } from "@lit/context";
import { mdiDelete, mdiDotsVertical, mdiImagePlus, mdiPencil } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket/dist/types";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { goBack } from "../../../common/navigate";
import { computeDeviceNameDisplay } from "../../../common/entity/compute_device_name";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import { groupBy } from "../../../common/util/group-by";
import { afterNextRender } from "../../../common/util/render-status";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-button";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import "../../../components/ha-list";
import "../../../components/ha-tooltip";
import type { AreaRegistryEntry } from "../../../data/area_registry";
import {
  deleteAreaRegistryEntry,
  updateAreaRegistryEntry,
} from "../../../data/area_registry";
import type { AutomationEntity } from "../../../data/automation";
import { fullEntitiesContext } from "../../../data/context";
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import { sortDeviceRegistryByName } from "../../../data/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import {
  computeEntityRegistryName,
  sortEntityRegistryByName,
} from "../../../data/entity_registry";
import type { SceneEntity } from "../../../data/scene";
import type { ScriptEntity } from "../../../data/script";
import type { RelatedResult } from "../../../data/search";
import { findRelated } from "../../../data/search";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "../../logbook/ha-logbook";
import {
  loadAreaRegistryDetailDialog,
  showAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";

declare interface NameAndEntity<EntityType extends HassEntity> {
  name: string;
  entity: EntityType;
}

@customElement("ha-config-area-page")
class HaConfigAreaPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public areaId!: string;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public showAdvanced = false;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  @state() private _related?: RelatedResult;

  private _logbookTime = { recent: 86400 };

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
    const { devices, entities } = memberships;

    // Pre-compute the entity and device names, so we can sort by them
    if (devices) {
      devices.forEach((entry) => {
        entry.name = computeDeviceNameDisplay(entry, this.hass);
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
        .header=${html`${area.icon
          ? html`<ha-icon
              .icon=${area.icon}
              style="margin-inline-end: 8px;"
            ></ha-icon>`
          : nothing}${area.name}`}
      >
        <ha-button-menu slot="toolbar-icon">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <ha-list-item
            graphic="icon"
            .entry=${area}
            @click=${this._showSettings}
          >
            ${this.hass.localize("ui.panel.config.areas.edit_settings")}
            <ha-svg-icon slot="graphic" .path=${mdiPencil}> </ha-svg-icon>
          </ha-list-item>

          <ha-list-item
            class="warning"
            graphic="icon"
            @click=${this._deleteConfirm}
          >
            ${this.hass.localize("ui.panel.config.areas.editor.delete")}
            <ha-svg-icon class="warning" slot="graphic" .path=${mdiDelete}>
            </ha-svg-icon>
          </ha-list-item>
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
              : html`<ha-button
                  appearance="filled"
                  size="small"
                  .entry=${area}
                  @click=${this._showSettings}
                >
                  <ha-svg-icon .path=${mdiImagePlus} slot="start"></ha-svg-icon>
                  ${this.hass.localize("ui.panel.config.areas.add_picture")}
                </ha-button>`}
            <ha-card
              outlined
              .header=${this.hass.localize("ui.panel.config.devices.caption")}
              >${devices.length
                ? html`<ha-list>
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
                  </ha-list>`
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
                ? html`<ha-list>
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
                    )}</ha-list
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
                          <ha-list>
                            ${groupedAutomations.map((automation) =>
                              this._renderAutomation(
                                automation.name,
                                automation.entity
                              )
                            )}</ha-list
                          >`
                      : ""}
                    ${relatedAutomations?.length
                      ? html`<h3>
                            ${this.hass.localize(
                              "ui.panel.config.areas.targeting_area"
                            )}:
                          </h3>
                          <ha-list>
                            ${relatedAutomations.map((automation) =>
                              this._renderAutomation(
                                automation.name,
                                automation.entity
                              )
                            )}</ha-list
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
                          <ha-list>
                            ${groupedScenes.map((scene) =>
                              this._renderScene(scene.name, scene.entity)
                            )}</ha-list
                          >`
                      : ""}
                    ${relatedScenes?.length
                      ? html`<h3>
                            ${this.hass.localize(
                              "ui.panel.config.areas.targeting_area"
                            )}:
                          </h3>
                          <ha-list>
                            ${relatedScenes.map((scene) =>
                              this._renderScene(scene.name, scene.entity)
                            )}</ha-list
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
    return html`<ha-tooltip
      .distance=${-4}
      .disabled=${!!entityState.attributes.id}
      .content=${this.hass.localize("ui.panel.config.devices.cant_edit")}
    >
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
    </ha-tooltip>`;
  }

  private _renderAutomation(name: string, entityState: AutomationEntity) {
    return html`<ha-tooltip
      .disabled=${!!entityState.attributes.id}
      .distance=${-4}
      .content=${this.hass.localize("ui.panel.config.devices.cant_edit")}
    >
      <a
        href=${ifDefined(
          entityState.attributes.id
            ? `/config/automation/edit/${encodeURIComponent(entityState.attributes.id)}`
            : undefined
        )}
      >
        <ha-list-item .disabled=${!entityState.attributes.id} hasMeta>
          <span>${name}</span>
          <ha-icon-next slot="meta"></ha-icon-next>
        </ha-list-item>
      </a>
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
        afterNextRender(() => goBack("/config"));
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
          inset-inline-end: 4px;
          inset-inline-start: initial;
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
