import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../components/dialog/ha-paper-dialog";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import memoizeOne from "memoize-one";
import {
  AreaRegistryEntry,
  updateAreaRegistryEntry,
  deleteAreaRegistryEntry,
} from "../../../data/area_registry";
import {
  DeviceRegistryEntry,
  devicesInArea,
  computeDeviceName,
} from "../../../data/device_registry";
import { configSections } from "../ha-panel-config";
import {
  showAreaRegistryDetailDialog,
  loadAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { RelatedResult, findRelated } from "../../../data/search";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { navigate } from "../../../common/navigate";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { ifDefined } from "lit-html/directives/if-defined";

@customElement("ha-config-area-page")
class HaConfigAreaPage extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public areaId!: string;
  @property() public areas!: AreaRegistryEntry[];
  @property() public devices!: DeviceRegistryEntry[];
  @property({ type: Boolean, reflect: true }) public narrow!: boolean;
  @property() public isWide!: boolean;
  @property() public showAdvanced!: boolean;
  @property() public route!: Route;
  @property() private _related?: RelatedResult;

  private _area = memoizeOne((areaId: string, areas: AreaRegistryEntry[]):
    | AreaRegistryEntry
    | undefined => areas.find((area) => area.area_id === areaId));

  private _devices = memoizeOne(
    (areaId: string, devices: DeviceRegistryEntry[]): DeviceRegistryEntry[] =>
      devicesInArea(devices, areaId)
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
          error="${this.hass.localize("ui.panel.config.areas.area_not_found")}"
        ></hass-error-screen>
      `;
    }

    const devices = this._devices(this.areaId, this.devices);

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${configSections.integrations}
        .route=${this.route}
      >
        ${this.narrow
          ? html`
              <span slot="header">
                ${area.name}
              </span>
            `
          : ""}

        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:settings"
          .entry=${area}
          @click=${this._showSettings}
        ></paper-icon-button>

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
                          const state = this.hass.states[automation];
                          return state
                            ? html`
                                <div>
                                  <a
                                    href=${ifDefined(
                                      state.attributes.id
                                        ? `/config/automation/edit/${state.attributes.id}`
                                        : undefined
                                    )}
                                  >
                                    <paper-item
                                      .disabled=${!state.attributes.id}
                                    >
                                      <paper-item-body>
                                        ${computeStateName(state)}
                                      </paper-item-body>
                                      <ha-icon-next></ha-icon-next>
                                    </paper-item>
                                  </a>
                                  ${!state.attributes.id
                                    ? html`
                                        <paper-tooltip
                                          >${this.hass.localize(
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
                          const state = this.hass.states[scene];
                          return state
                            ? html`
                                <div>
                                  <a
                                    href=${ifDefined(
                                      state.attributes.id
                                        ? `/config/scene/edit/${state.attributes.id}`
                                        : undefined
                                    )}
                                  >
                                    <paper-item
                                      .disabled=${!state.attributes.id}
                                    >
                                      <paper-item-body>
                                        ${computeStateName(state)}
                                      </paper-item-body>
                                      <ha-icon-next></ha-icon-next>
                                    </paper-item>
                                  </a>
                                  ${!state.attributes.id
                                    ? html`
                                        <paper-tooltip
                                          >${this.hass.localize(
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
                          const state = this.hass.states[script];
                          return state
                            ? html`
                                <a
                                  href=${ifDefined(
                                    state.attributes.id
                                      ? `/config/script/edit/${state.attributes.id}`
                                      : undefined
                                  )}
                                >
                                  <paper-item>
                                    <paper-item-body>
                                      ${computeStateName(state)}
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
            dismissText: this.hass.localize("ui.common.no"),
            confirmText: this.hass.localize("ui.common.yes"),
          }))
        ) {
          return false;
        }

        try {
          await deleteAreaRegistryEntry(this.hass!, entry!.area_id);
          return true;
        } catch (err) {
          return false;
        }
      },
    });
  }

  static get styles(): CSSResult[] {
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
