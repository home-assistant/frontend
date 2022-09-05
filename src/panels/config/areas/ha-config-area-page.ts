import "@material/mwc-button";
import { mdiImagePlus, mdiPencil } from "@mdi/js";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import {
  HassEntity,
  UnsubscribeFunc,
} from "home-assistant-js-websocket/dist/types";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
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
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "../../logbook/ha-logbook";
import {
  loadAreaRegistryDetailDialog,
  showAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-subpage";

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

  protected render(): TemplateResult {
    if (!this._areas || !this._devices || !this._entities) {
      return html``;
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
      sortDeviceRegistryByName(devices);
    }
    if (entities) {
      entities.forEach((entry) => {
        entry.name = computeEntityRegistryName(this.hass, entry);
      });
      sortEntityRegistryByName(entities);
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
        <ha-icon-button
          .path=${mdiPencil}
          .entry=${area}
          @click=${this._showSettings}
          slot="toolbar-icon"
          .label=${this.hass.localize("ui.panel.config.areas.edit_settings")}
        ></ha-icon-button>

        <div class="container">
          <div class="column">
            ${area.picture
              ? html`<div class="img-container">
                  <img src=${area.picture} /><ha-icon-button
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
                ? devices.map(
                    (device) =>
                      html`
                        <a href="/config/devices/device/${device.id}">
                          <paper-item>
                            <paper-item-body> ${device.name} </paper-item-body>
                            <ha-icon-next></ha-icon-next>
                          </paper-item>
                        </a>
                      `
                  )
                : html`
                    <paper-item class="no-link"
                      >${this.hass.localize(
                        "ui.panel.config.devices.no_devices"
                      )}</paper-item
                    >
                  `}
            </ha-card>
            <ha-card
              outlined
              .header=${this.hass.localize(
                "ui.panel.config.areas.editor.linked_entities_caption"
              )}
            >
              ${entities.length
                ? entities.map((entity) =>
                    ["scene", "script", "automation"].includes(
                      computeDomain(entity.entity_id)
                    )
                      ? ""
                      : html`
                          <paper-item
                            @click=${this._openEntity}
                            .entity=${entity}
                          >
                            <paper-item-body> ${entity.name} </paper-item-body>
                            <ha-icon-next></ha-icon-next>
                          </paper-item>
                        `
                  )
                : html`
                    <paper-item class="no-link"
                      >${this.hass.localize(
                        "ui.panel.config.areas.editor.no_linked_entities"
                      )}</paper-item
                    >
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
                          ${groupedAutomations.map((automation) =>
                            this._renderAutomation(
                              automation.name,
                              automation.entity
                            )
                          )}`
                      : ""}
                    ${relatedAutomations?.length
                      ? html`<h3>
                            ${this.hass.localize(
                              "ui.panel.config.areas.targeting_area"
                            )}:
                          </h3>
                          ${relatedAutomations.map((automation) =>
                            this._renderAutomation(
                              automation.name,
                              automation.entity
                            )
                          )}`
                      : ""}
                    ${!groupedAutomations?.length && !relatedAutomations?.length
                      ? html`
                          <paper-item class="no-link"
                            >${this.hass.localize(
                              "ui.panel.config.devices.automation.no_automations"
                            )}</paper-item
                          >
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
                          ${groupedScenes.map((scene) =>
                            this._renderScene(scene.name, scene.entity)
                          )}`
                      : ""}
                    ${relatedScenes?.length
                      ? html`<h3>
                            ${this.hass.localize(
                              "ui.panel.config.areas.targeting_area"
                            )}:
                          </h3>
                          ${relatedScenes.map((scene) =>
                            this._renderScene(scene.name, scene.entity)
                          )}`
                      : ""}
                    ${!groupedScenes?.length && !relatedScenes?.length
                      ? html`
                          <paper-item class="no-link"
                            >${this.hass.localize(
                              "ui.panel.config.devices.scene.no_scenes"
                            )}</paper-item
                          >
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
                          <paper-item class="no-link"
                            >${this.hass.localize(
                              "ui.panel.config.devices.script.no_scripts"
                            )}</paper-item
                          >
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
        caseInsensitiveStringCompare(entry1.name!, entry2.name!)
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
        caseInsensitiveStringCompare(entry1.name!, entry2.name!)
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
        <paper-item .disabled=${!entityState.attributes.id}>
          <paper-item-body> ${name} </paper-item-body>
          <ha-icon-next></ha-icon-next>
        </paper-item>
      </a>
      ${!entityState.attributes.id
        ? html`
            <paper-tooltip animation-delay="0">
              ${this.hass.localize("ui.panel.config.devices.cant_edit")}
            </paper-tooltip>
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
        <paper-item .disabled=${!entityState.attributes.id}>
          <paper-item-body> ${name} </paper-item-body>
          <ha-icon-next></ha-icon-next>
        </paper-item>
      </a>
      ${!entityState.attributes.id
        ? html`
            <paper-tooltip animation-delay="0">
              ${this.hass.localize("ui.panel.config.devices.cant_edit")}
            </paper-tooltip>
          `
        : ""}
    </div>`;
  }

  private _renderScript(name: string, entityState: ScriptEntity) {
    return html`<a href=${`/config/script/edit/${entityState.entity_id}`}>
      <paper-item>
        <paper-item-body> ${name} </paper-item-body>
        <ha-icon-next></ha-icon-next>
      </paper-item>
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
      removeEntry: async () => {
        if (
          !(await showConfirmationDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.areas.delete.confirmation_title"
            ),
            text: this.hass.localize(
              "ui.panel.config.areas.delete.confirmation_text"
            ),
            dismissText: this.hass.localize("ui.common.cancel"),
            confirmText: this.hass.localize("ui.common.delete"),
          }))
        ) {
          return false;
        }

        try {
          await deleteAreaRegistryEntry(this.hass!, entry!.area_id);
          afterNextRender(() => history.back());
          return true;
        } catch (err: any) {
          return false;
        }
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        h1 {
          margin: 0;
          font-family: var(--paper-font-headline_-_font-family);
          -webkit-font-smoothing: var(
            --paper-font-headline_-_-webkit-font-smoothing
          );
          font-size: var(--paper-font-headline_-_font-size);
          font-weight: var(--paper-font-headline_-_font-weight);
          letter-spacing: var(--paper-font-headline_-_letter-spacing);
          line-height: var(--paper-font-headline_-_line-height);
          opacity: var(--dark-primary-opacity);
          display: flex;
          align-items: center;
        }

        h3 {
          margin: 0;
          padding: 0 16px;
          font-weight: 500;
          color: var(--secondary-text-color);
        }

        img {
          border-radius: var(--ha-card-border-radius, 4px);
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

        paper-item {
          cursor: pointer;
          font-size: var(--paper-font-body1_-_font-size);
        }

        a {
          text-decoration: none;
          color: var(--primary-text-color);
        }

        paper-item.no-link {
          cursor: default;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-area-page": HaConfigAreaPage;
  }
}
