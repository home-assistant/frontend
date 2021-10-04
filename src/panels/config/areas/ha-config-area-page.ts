import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-card";
import {
  AreaRegistryEntry,
  deleteAreaRegistryEntry,
  updateAreaRegistryEntry,
} from "../../../data/area_registry";
import {
  computeDeviceName,
  DeviceRegistryEntry,
} from "../../../data/device_registry";
import {
  computeEntityRegistryName,
  EntityRegistryEntry,
} from "../../../data/entity_registry";
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

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${configSections.integrations}
        .route=${this.route}
      >
        ${this.narrow ? html` <span slot="header"> ${area.name} </span> ` : ""}

        <ha-icon-button
          slot="toolbar-icon"
          icon="hass:cog"
          .entry=${area}
          @click=${this._showSettings}
        ></ha-icon-button>

        <div class="container">
          ${!this.narrow
            ? html`
                <div class="fullwidth">
                  <h1>${area.name}</h1>
                </div>
              `
            : ""}
          <div class="column">
            <ha-card
              .header=${this.hass.localize("ui.panel.config.devices.caption")}
              >${devices.length
                ? devices.map(
                    (device) =>
                      html`
                        <a href="/config/devices/device/${device.id}">
                          <paper-item>
                            <paper-item-body>
                              ${computeDeviceName(device, this.hass)}
                            </paper-item-body>
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
              >${entities.length
                ? entities.map(
                    (entity) =>
                      html`
                        <paper-item
                          @click=${this._openEntity}
                          .entity=${entity}
                        >
                          <paper-item-body>
                            ${computeEntityRegistryName(this.hass, entity)}
                          </paper-item-body>
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
                    >${this._related?.automation?.length
                      ? this._related.automation.map((automation) => {
                          const entityState = this.hass.states[automation];
                          return entityState
                            ? html`
                                <div>
                                  <a
                                    href=${ifDefined(
                                      entityState.attributes.id
                                        ? `/config/automation/edit/${entityState.attributes.id}`
                                        : undefined
                                    )}
                                  >
                                    <paper-item
                                      .disabled=${!entityState.attributes.id}
                                    >
                                      <paper-item-body>
                                        ${computeStateName(entityState)}
                                      </paper-item-body>
                                      <ha-icon-next></ha-icon-next>
                                    </paper-item>
                                  </a>
                                  ${!entityState.attributes.id
                                    ? html`
                                        <paper-tooltip animation-delay="0">
                                          ${this.hass.localize(
                                            "ui.panel.config.devices.cant_edit"
                                          )}
                                        </paper-tooltip>
                                      `
                                    : ""}
                                </div>
                              `
                            : "";
                        })
                      : html`
                          <paper-item class="no-link"
                            >${this.hass.localize(
                              "ui.panel.config.devices.automation.no_automations"
                            )}</paper-item
                          >
                        `}
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
                    >${this._related?.scene?.length
                      ? this._related.scene.map((scene) => {
                          const entityState = this.hass.states[scene];
                          return entityState
                            ? html`
                                <div>
                                  <a
                                    href=${ifDefined(
                                      entityState.attributes.id
                                        ? `/config/scene/edit/${entityState.attributes.id}`
                                        : undefined
                                    )}
                                  >
                                    <paper-item
                                      .disabled=${!entityState.attributes.id}
                                    >
                                      <paper-item-body>
                                        ${computeStateName(entityState)}
                                      </paper-item-body>
                                      <ha-icon-next></ha-icon-next>
                                    </paper-item>
                                  </a>
                                  ${!entityState.attributes.id
                                    ? html`
                                        <paper-tooltip animation-delay="0">
                                          ${this.hass.localize(
                                            "ui.panel.config.devices.cant_edit"
                                          )}
                                        </paper-tooltip>
                                      `
                                    : ""}
                                </div>
                              `
                            : "";
                        })
                      : html`
                          <paper-item class="no-link"
                            >${this.hass.localize(
                              "ui.panel.config.devices.scene.no_scenes"
                            )}</paper-item
                          >
                        `}
                  </ha-card>
                `
              : ""}
            ${isComponentLoaded(this.hass, "script")
              ? html`
                  <ha-card
                    .header=${this.hass.localize(
                      "ui.panel.config.devices.script.scripts"
                    )}
                    >${this._related?.script?.length
                      ? this._related.script.map((script) => {
                          const entityState = this.hass.states[script];
                          return entityState
                            ? html`
                                <a
                                  href=${`/config/script/edit/${entityState.entity_id}`}
                                >
                                  <paper-item>
                                    <paper-item-body>
                                      ${computeStateName(entityState)}
                                    </paper-item-body>
                                    <ha-icon-next></ha-icon-next>
                                  </paper-item>
                                </a>
                              `
                            : "";
                        })
                      : html`
                          <paper-item class="no-link">
                            ${this.hass.localize(
                              "ui.panel.config.devices.script.no_scripts"
                            )}</paper-item
                          >
                        `}
                  </ha-card>
                `
              : ""}
          </div>
        </div>
      </hass-tabs-subpage>
    `;
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
          margin-top: 0;
          font-family: var(--paper-font-headline_-_font-family);
          -webkit-font-smoothing: var(
            --paper-font-headline_-_-webkit-font-smoothing
          );
          font-size: var(--paper-font-headline_-_font-size);
          font-weight: var(--paper-font-headline_-_font-weight);
          letter-spacing: var(--paper-font-headline_-_letter-spacing);
          line-height: var(--paper-font-headline_-_line-height);
          opacity: var(--dark-primary-opacity);
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-area-page": HaConfigAreaPage;
  }
}
