import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../../../components/entity/state-badge";
import "../../../components/ha-card";
import "@material/mwc-button";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-listbox/paper-listbox";

import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";

import { fireEvent } from "../../../common/dom/fire_event";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../../data/area_registry";
import {
  DeviceRegistryEntryMutableParams,
  updateDeviceRegistryEntry,
} from "../../../data/device_registry";
import {
  reconfigureNode,
  ZHADevice,
  ZHAEntityReference,
} from "../../../data/zha";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { ItemSelectedEvent, NodeServiceData } from "./types";
import { navigate } from "../../../common/navigate";
import { UnsubscribeFunc, HassEvent } from "home-assistant-js-websocket";
import { formatAsPaddedHex } from "./functions";
import { computeStateName } from "../../../common/entity/compute_state_name";

declare global {
  // for fire event
  interface HASSDomEvents {
    "zha-device-removed": {
      device?: ZHADevice;
    };
  }
}

@customElement("zha-device-card")
class ZHADeviceCard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public device?: ZHADevice;
  @property({ type: Boolean }) public narrow?: boolean;
  @property({ type: Boolean }) public showHelp?: boolean = false;
  @property({ type: Boolean }) public showActions?: boolean = true;
  @property({ type: Boolean }) public showName?: boolean = true;
  @property({ type: Boolean }) public showEntityDetail?: boolean = true;
  @property({ type: Boolean }) public showModelInfo?: boolean = true;
  @property({ type: Boolean }) public showEditableInfo?: boolean = true;
  @property() private _serviceData?: NodeServiceData;
  @property() private _areas: AreaRegistryEntry[] = [];
  @property() private _selectedAreaIndex: number = -1;
  @property() private _userGivenName?: string;
  private _unsubAreas?: UnsubscribeFunc;
  private _unsubEntities?: UnsubscribeFunc;

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubAreas) {
      this._unsubAreas();
    }
    if (this._unsubEntities) {
      this._unsubEntities();
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    this._unsubAreas = subscribeAreaRegistry(this.hass.connection, (areas) => {
      this._areas = areas;
      if (this.device) {
        this._selectedAreaIndex =
          this._areas.findIndex(
            (area) => area.area_id === this.device!.area_id
          ) + 1; // account for the no area selected index
      }
    });
    this.hass.connection
      .subscribeEvents((event: HassEvent) => {
        if (this.device) {
          this.device!.entities.forEach((deviceEntity) => {
            if (event.data.old_entity_id === deviceEntity.entity_id) {
              deviceEntity.entity_id = event.data.entity_id;
            }
          });
        }
      }, "entity_registry_updated")
      .then((unsub) => (this._unsubEntities = unsub));
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.addEventListener("hass-service-called", (ev) =>
      this.serviceCalled(ev)
    );
    this._serviceData = {
      ieee_address: this.device!.ieee,
    };
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("device")) {
      if (!this._areas || !this.device || !this.device.area_id) {
        this._selectedAreaIndex = 0;
      } else {
        this._selectedAreaIndex =
          this._areas.findIndex(
            (area) => area.area_id === this.device!.area_id
          ) + 1;
      }
      this._userGivenName = this.device!.user_given_name;
    }
    super.update(changedProperties);
  }

  protected serviceCalled(ev): void {
    // Check if this is for us
    if (ev.detail.success && ev.detail.service === "remove") {
      fireEvent(this, "zha-device-removed", {
        device: this.device,
      });
    }
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-card header="${this.showName ? this.device!.name : ""}">
        ${
          this.showModelInfo
            ? html`
                <div class="info">
                  <div class="model">${this.device!.model}</div>
                  <div class="manuf">
                    ${this.hass!.localize(
                      "ui.dialogs.zha_device_info.manuf",
                      "manufacturer",
                      this.device!.manufacturer
                    )}
                  </div>
                </div>
              `
            : ""
        }
        <div class="card-content">
          <dl>
            <dt>IEEE:</dt>
            <dd class="zha-info">${this.device!.ieee}</dd>
            <dt>Nwk:</dt>
            <dd class="zha-info">${formatAsPaddedHex(this.device!.nwk)}</dd>
            <dt>LQI:</dt>
            <dd class="zha-info">${this.device!.lqi ||
              this.hass!.localize("ui.dialogs.zha_device_info.unknown")}</dd>
            <dt>RSSI:</dt>
            <dd class="zha-info">${this.device!.rssi ||
              this.hass!.localize("ui.dialogs.zha_device_info.unknown")}</dd>
            <dt>${this.hass!.localize(
              "ui.dialogs.zha_device_info.last_seen"
            )}:</dt>
            <dd class="zha-info">${this.device!.last_seen ||
              this.hass!.localize("ui.dialogs.zha_device_info.unknown")}</dd>
            <dt>${this.hass!.localize(
              "ui.dialogs.zha_device_info.power_source"
            )}:</dt>
            <dd class="zha-info">${this.device!.power_source ||
              this.hass!.localize("ui.dialogs.zha_device_info.unknown")}</dd>
            ${
              this.device!.quirk_applied
                ? html`
                    <dt>
                      ${this.hass!.localize(
                        "ui.dialogs.zha_device_info.quirk"
                      )}:
                    </dt>
                    <dd class="zha-info">${this.device!.quirk_class}</dd>
                  `
                : ""
            }
          </dl>
        </div>

        <div class="device-entities">
          ${this.device!.entities.map(
            (entity) => html`
              <paper-icon-item
                @click="${this._openMoreInfo}"
                .entity="${entity}"
              >
                <state-badge
                  .stateObj="${this.hass!.states[entity.entity_id]}"
                  slot="item-icon"
                ></state-badge>
                ${this.showEntityDetail
                  ? html`
                      <paper-item-body>
                        <div class="name">
                          ${this._computeEntityName(entity)}
                        </div>
                        <div class="secondary entity-id">
                          ${entity.entity_id}
                        </div>
                      </paper-item-body>
                    `
                  : ""}
              </paper-icon-item>
            `
          )}
        </div>
        ${
          this.showEditableInfo
            ? html`
                <div class="editable">
                  <paper-input
                    type="string"
                    @change="${this._saveCustomName}"
                    .value="${this._userGivenName}"
                    placeholder="${this.hass!.localize(
                      "ui.dialogs.zha_device_info.zha_device_card.device_name_placeholder"
                    )}"
                  ></paper-input>
                </div>
                <div class="node-picker">
                  <paper-dropdown-menu
                    label="${this.hass!.localize(
                      "ui.dialogs.zha_device_info.zha_device_card.area_picker_label"
                    )}"
                    class="menu"
                  >
                    <paper-listbox
                      slot="dropdown-content"
                      .selected="${this._selectedAreaIndex}"
                      @iron-select="${this._selectedAreaChanged}"
                    >
                      <paper-item>
                        ${this.hass!.localize(
                          "ui.dialogs.zha_device_info.no_area"
                        )}
                      </paper-item>

                      ${this._areas.map(
                        (entry) => html`
                          <paper-item area="${entry}">${entry.name}</paper-item>
                        `
                      )}
                    </paper-listbox>
                  </paper-dropdown-menu>
                </div>
              `
            : ""
        }
        ${
          this.showActions
            ? html`
                <div class="card-actions">
                  <mwc-button @click="${this._onReconfigureNodeClick}">
                    ${this.hass!.localize(
                      "ui.dialogs.zha_device_info.buttons.reconfigure"
                    )}
                  </mwc-button>
                  ${this.showHelp
                    ? html`
                        <div class="help-text">
                          ${this.hass!.localize(
                            "ui.dialogs.zha_device_info.services.reconfigure"
                          )}
                        </div>
                      `
                    : ""}

                  <ha-call-service-button
                    .hass="${this.hass}"
                    domain="zha"
                    service="remove"
                    confirmation=${this.hass!.localize(
                      "ui.dialogs.zha_device_info.confirmations.remove"
                    )}
                    .serviceData="${this._serviceData}"
                  >
                    ${this.hass!.localize(
                      "ui.dialogs.zha_device_info.buttons.remove"
                    )}
                  </ha-call-service-button>
                  ${this.showHelp
                    ? html`
                        <div class="help-text">
                          ${this.hass!.localize(
                            "ui.dialogs.zha_device_info.services.remove"
                          )}
                        </div>
                      `
                    : ""}
                  ${this.device!.power_source === "Mains"
                    ? html`
                        <mwc-button @click=${this._onAddDevicesClick}>
                          ${this.hass!.localize(
                            "ui.panel.config.zha.common.add_devices"
                          )}
                        </mwc-button>
                        ${this.showHelp
                          ? html`
                              <ha-service-description
                                .hass="${this.hass}"
                                domain="zha"
                                service="permit"
                                class="help-text2"
                              />
                            `
                          : ""}
                      `
                    : ""}
                </div>
              `
            : ""
        }
        </div>
      </ha-card>
    `;
  }

  private async _onReconfigureNodeClick(): Promise<void> {
    if (this.hass) {
      await reconfigureNode(this.hass, this.device!.ieee);
    }
  }

  private _computeEntityName(entity: ZHAEntityReference): string {
    if (this.hass.states[entity.entity_id]) {
      return computeStateName(this.hass.states[entity.entity_id]);
    }
    return entity.name;
  }

  private async _saveCustomName(event): Promise<void> {
    if (this.hass) {
      const values: DeviceRegistryEntryMutableParams = {
        name_by_user: event.target.value,
        area_id: this.device!.area_id ? this.device!.area_id : undefined,
      };

      await updateDeviceRegistryEntry(
        this.hass,
        this.device!.device_reg_id,
        values
      );

      this.device!.user_given_name = event.target.value;
    }
  }

  private _openMoreInfo(ev: MouseEvent): void {
    fireEvent(this, "hass-more-info", {
      entityId: (ev.currentTarget as any).entity.entity_id,
    });
  }

  private async _selectedAreaChanged(event: ItemSelectedEvent) {
    if (!this.device || !this._areas) {
      return;
    }
    this._selectedAreaIndex = event!.target!.selected;
    const area = this._areas[this._selectedAreaIndex - 1]; // account for No Area
    if (
      (!area && !this.device.area_id) ||
      (area && area.area_id === this.device.area_id)
    ) {
      return;
    }

    const newAreaId = area ? area.area_id : undefined;
    await updateDeviceRegistryEntry(this.hass!, this.device.device_reg_id, {
      area_id: newAreaId,
      name_by_user: this.device!.user_given_name,
    });
    this.device!.area_id = newAreaId;
  }

  private _onAddDevicesClick() {
    navigate(this, "/config/zha/add/" + this.device!.ieee);
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host(:not([narrow])) .device-entities {
          max-height: 225px;
          overflow-y: auto;
          display: flex;
          flex-wrap: wrap;
          padding: 4px;
          justify-content: left;
        }
        ha-card {
          flex: 1 0 100%;
          padding-bottom: 10px;
          min-width: 300px;
        }
        .device {
          width: 30%;
        }
        .device .name {
          font-weight: bold;
        }
        .device .manuf {
          color: var(--secondary-text-color);
          margin-bottom: 20px;
        }
        .extra-info {
          margin-top: 8px;
        }
        .manuf,
        .zha-info,
        .name {
          text-overflow: ellipsis;
        }
        .entity-id {
          text-overflow: ellipsis;
          color: var(--secondary-text-color);
        }
        .info {
          margin-left: 16px;
        }
        dl {
          display: flex;
          flex-wrap: wrap;
          width: 100%;
        }
        dl dt {
          display: inline-block;
          width: 30%;
          padding-left: 12px;
          float: left;
          text-align: left;
        }
        dl dd {
          width: 60%;
          overflow-wrap: break-word;
          margin-inline-start: 20px;
        }
        paper-icon-item {
          overflow-x: hidden;
          cursor: pointer;
          padding-top: 4px;
          padding-bottom: 4px;
        }
        .editable {
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }
        .help-text {
          color: grey;
          padding: 16px;
        }
        .menu {
          width: 100%;
        }
        .node-picker {
          align-items: center;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-card": ZHADeviceCard;
  }
}
