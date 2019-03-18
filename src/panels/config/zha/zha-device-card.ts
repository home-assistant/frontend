import {
  html,
  LitElement,
  property,
  TemplateResult,
  CSSResult,
  PropertyValues,
  customElement,
  css,
} from "lit-element";
import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "../../../components/buttons/ha-call-service-button";
import { fireEvent } from "../../../common/dom/fire_event";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { NodeServiceData, ChangeEvent, ItemSelectedEvent } from "./types";
import {
  updateDeviceRegistryEntry,
  DeviceRegistryEntryMutableParams,
} from "../../../data/device_registry";
import { reconfigureNode, ZHADevice } from "../../../data/zha";
import "../../../components/entity/state-badge";
import {
  fetchAreaRegistry,
  AreaRegistryEntry,
} from "../../../data/area_registry";
import compare from "../../../common/string/compare";

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
  @property() public hass?: HomeAssistant;
  @property() public narrow?: boolean;
  @property() public device?: ZHADevice;
  @property() public showHelp: boolean = false;
  @property() private _userSelectedName?: string;
  @property() private _serviceData?: NodeServiceData;
  @property() private _areas: AreaRegistryEntry[] = [];
  @property() private _selectedAreaIndex: number = -1;

  public firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.addEventListener("hass-service-called", (ev) =>
      this.serviceCalled(ev)
    );
    this._serviceData = {
      ieee_address: this.device!.ieee,
    };
    fetchAreaRegistry(this.hass!).then((areas) => {
      this._areas = areas.sort((a, b) => compare(a.name, b.name));
    });
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("device")) {
      this._selectedAreaIndex =
        this._areas.findIndex((area) => area.area_id === this.device!.area_id) +
        1;
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
      <paper-card>
        <div class="card-content">
          <dl>
            <dt class="label">IEEE:</dt>
            <dd class="info">${this.device!.ieee}</dd>
            <dt class="label">Quirk applied:</dt>
            <dd class="info">${this.device!.quirk_applied}</dd>
            <dt class="label">Quirk:</dt>
            <dd class="info">${this.device!.quirk_class}</dd>
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
                <paper-item-body>
                  <div class="name">${entity.name}</div>
                  <div class="secondary entity-id">${entity.entity_id}</div>
                </paper-item-body>
              </paper-icon-item>
            `
          )}
        </div>
        <div class="editable">
          <paper-input
            type="string"
            .value="${this._userSelectedName}"
            @value-changed="${this._onUserSelectedNameChanged}"
            placeholder="${this.hass!.localize(
              "ui.panel.config.zha.device_card.device_name_placeholder"
            )}"
          ></paper-input>
        </div>
        <div class="node-picker">
          <paper-dropdown-menu
            label="${this.hass!.localize(
              "ui.panel.config.zha.device_card.area_picker_label"
            )}"
            class="flex"
          >
            <paper-listbox
              slot="dropdown-content"
              .selected="${this._selectedAreaIndex}"
              @iron-select="${this._selectedAreaChanged}"
            >
              <paper-item>
                ${this.hass!.localize(
                  "ui.panel.config.integrations.config_entry.no_area"
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
        <div class="card-actions">
          <mwc-button @click="${this._onReconfigureNodeClick}"
            >Reconfigure Device</mwc-button
          >
          ${this.showHelp
            ? html`
                <div class="help-text">
                  ${this.hass!.localize(
                    "ui.panel.config.zha.services.reconfigure"
                  )}
                </div>
              `
            : ""}
          <ha-call-service-button
            .hass="${this.hass}"
            domain="zha"
            service="remove"
            .serviceData="${this._serviceData}"
            >Remove Device</ha-call-service-button
          >
          ${this.showHelp
            ? html`
                <div class="help-text">
                  ${this.hass!.localize("ui.panel.config.zha.services.remove")}
                </div>
              `
            : ""}
          <mwc-button
            @click="${this._onUpdateDeviceNameClick}"
            .disabled="${!this._userSelectedName ||
              this._userSelectedName === ""}"
            >${this.hass!.localize(
              "ui.panel.config.zha.device_card.update_name_button"
            )}</mwc-button
          >
          ${this.showHelp
            ? html`
                <div class="help-text">
                  ${this.hass!.localize(
                    "ui.panel.config.zha.services.updateDeviceName"
                  )}
                </div>
              `
            : ""}
        </div>
      </paper-card>
    `;
  }

  private async _onReconfigureNodeClick(): Promise<void> {
    if (this.hass) {
      await reconfigureNode(this.hass, this.device!.ieee);
    }
  }

  private _onUserSelectedNameChanged(value: ChangeEvent): void {
    this._userSelectedName = value.detail!.value;
  }

  private async _onUpdateDeviceNameClick(): Promise<void> {
    if (this.hass) {
      const values: DeviceRegistryEntryMutableParams = {
        name_by_user: this._userSelectedName,
        area_id: this.device!.area_id ? this.device!.area_id : undefined,
      };

      await updateDeviceRegistryEntry(
        this.hass,
        this.device!.device_reg_id,
        values
      );

      this.device!.user_given_name = this._userSelectedName!;
      this._userSelectedName = "";
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

    await updateDeviceRegistryEntry(this.hass!, this.device.device_reg_id, {
      area_id: area ? area.area_id : undefined,
      name_by_user:
        this._userSelectedName || this._userSelectedName !== ""
          ? this._userSelectedName
          : undefined,
    });
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host(:not([narrow])) .device-entities {
          max-height: 225px;
          overflow: auto;
        }
        paper-card {
          flex: 1 0 100%;
          padding-bottom: 10px;
          min-width: 0;
        }
        .device {
          width: 30%;
        }
        .label {
          font-weight: bold;
        }
        .info {
          color: var(--secondary-text-color);
          font-weight: bold;
        }
        dl dt {
          float: left;
          width: 100px;
          text-align: left;
        }
        dt dd {
          margin-left: 10px;
          text-align: left;
        }
        paper-icon-item {
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
        .flex {
          -ms-flex: 1 1 0.000000001px;
          -webkit-flex: 1;
          flex: 1;
          -webkit-flex-basis: 0.000000001px;
          flex-basis: 0.000000001px;
        }
        .node-picker {
          display: -ms-flexbox;
          display: -webkit-flex;
          display: flex;
          -ms-flex-direction: row;
          -webkit-flex-direction: row;
          flex-direction: row;
          -ms-flex-align: center;
          -webkit-align-items: center;
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
