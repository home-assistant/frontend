import "@material/mwc-button";
import { mdiImagePlus, mdiPencil } from "@mdi/js";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { HassEntity } from "home-assistant-js-websocket/dist/types";
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
  updateAreaRegistryEntry,
} from "../../../data/area_registry";
import { AutomationEntity } from "../../../data/automation";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  sortDeviceRegistryByName,
} from "../../../data/device_registry";
import {
  computeEntityRegistryName,
  EntityRegistryEntry,
  sortEntityRegistryByName,
} from "../../../data/entity_registry";
import { SceneEntity } from "../../../data/scene";
import { ScriptEntity } from "../../../data/script";
import { findRelated, RelatedResult } from "../../../data/search";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { showEntityEditorDialog } from "../entities/show-dialog-entity-editor";
import { configSections } from "../ha-panel-config";
import {
  loadAreaRegistryDetailDialog,
  showAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";

declare type NameAndEntity<EntityType extends HassEntity> = {
  name: string;
  entity: EntityType;
};

@customElement("ha-config-area-page")
class HaConfigAreaPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public areaId!: string;

  @property() public areas!: AreaRegistryEntry[];

  @property() public devices!: DeviceRegistryEntry[];

  @property() public entities!: EntityRegistryEntry[];

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public route!: Route;

  @state() private _related?: RelatedResult;

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
      const devices = new Map();

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
        } else if (devices.has(entity.device_id)) {
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

  protected render(): TemplateResult {
    const area = this._area(this.areaId, this.areas);

    if (!area) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this.hass.localize("ui.panel.config.areas.area_not_found")}
        ></hass-error-screen>
      `;
    }

    const { devices, entities } = this._memberships(
      this.areaId,
      this.devices,
      this.entities
    );

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
      const data = this._prepareEntities<AutomationEntity>(
        groupedEntities.automation,
        this._related?.automation
      );
      groupedAutomations = data.groupedEntities;
      relatedAutomations = data.relatedEntities;
    }

    if (isComponentLoaded(this.hass, "scene")) {
      const data = this._prepareEntities<SceneEntity>(
        groupedEntities.scene,
        this._related?.scene
      );
      groupedScenes = data.groupedEntities;
      relatedScenes = data.relatedEntities;
    }

    if (isComponentLoaded(this.hass, "script")) {
      const data = this._prepareEntities<ScriptEntity>(
        groupedEntities.script,
        this._related?.script
      );
      groupedScripts = data.groupedEntities;
      relatedScripts = data.relatedEntities;
    }

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${configSections.devices}
        .route=${this.route}
      >
        ${this.narrow
          ? html`<span slot="header"> ${area.name} </span>
              <ha-icon-button
                .path=${mdiPencil}
                .entry=${area}
                @click=${this._showSettings}
                slot="toolbar-icon"
                .label=${this.hass.localize(
                  "ui.panel.config.areas.edit_settings"
                )}
              ></ha-icon-button>`
          : ""}

        <div class="container">
          ${!this.narrow
            ? html`
                <div class="fullwidth">
                  <h1>
                    ${area.name}
                    <ha-icon-button
                      .path=${mdiPencil}
                      .entry=${area}
                      @click=${this._showSettings}
                      .label=${this.hass.localize(
                        "ui.panel.config.areas.edit_settings"
                      )}
                    ></ha-icon-button>
                  </h1>
                </div>
              `
            : ""}
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
                    .header=${this.hass.localize(
                      "ui.panel.config.devices.automation.automations"
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
          </div>
          <div class="column">
            ${isComponentLoaded(this.hass, "scene")
              ? html`
                  <ha-card
                    .header=${this.hass.localize(
                      "ui.panel.config.devices.scene.scenes"
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
                    .header=${this.hass.localize(
                      "ui.panel.config.devices.script.scripts"
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
        </div>
      </hass-tabs-subpage>
    `;
  }

  private _prepareEntities<EntityType extends HassEntity>(
    entries?: EntityRegistryEntry[],
    relatedEntityIds?: string[]
  ): {
    groupedEntities: NameAndEntity<EntityType>[];
    relatedEntities: NameAndEntity<EntityType>[];
  } {
    let groupedEntities: NameAndEntity<EntityType>[] = [];
    let relatedEntities: NameAndEntity<EntityType>[] = [];

    if (entries?.length) {
      groupedEntities = entries.reduce(
        (result: NameAndEntity<EntityType>[], entity) => {
          const entityState = this.hass.states[
            entity.entity_id
          ] as unknown as EntityType;
          if (entityState) {
            result.push({
              name: computeStateName(entityState),
              entity: entityState,
            });
          }
          return result;
        },
        []
      );
      groupedEntities.sort((entry1, entry2) =>
        caseInsensitiveStringCompare(entry1.name!, entry2.name!)
      );
    }
    if (relatedEntityIds?.length) {
      relatedEntities = relatedEntityIds.reduce(
        (result: NameAndEntity<EntityType>[], entity) => {
          const entityState = this.hass.states[entity] as EntityType;
          if (entityState) {
            result.push({
              name: entityState ? computeStateName(entityState) : "",
              entity: entityState,
            });
          }
          return result;
        },
        []
      );
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
    showEntityEditorDialog(this, {
      entity_id: entry.entity_id,
      entry,
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-area-page": HaConfigAreaPage;
  }
}
