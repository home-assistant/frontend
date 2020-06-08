import "@polymer/paper-input/paper-input";
import "@polymer/paper-listbox/paper-listbox";
import { HassEvent, UnsubscribeFunc } from "home-assistant-js-websocket";
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
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeStateName } from "../../../../../common/entity/compute_state_name";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/entity/state-badge";
import "../../../../../components/ha-card";
import "../../../../../components/ha-service-description";
import {
  DeviceRegistryEntryMutableParams,
  updateDeviceRegistryEntry,
} from "../../../../../data/device_registry";
import { ZHADevice } from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import "./../../../../../components/ha-area-picker";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";

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

  @property() private _userGivenName?: string;

  private _unsubEntities?: UnsubscribeFunc;

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubEntities) {
      this._unsubEntities();
    }
  }

  public connectedCallback() {
    super.connectedCallback();
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
      .then((unsub) => {
        this._unsubEntities = unsub;
      });
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.addEventListener("hass-service-called", (ev) =>
      this.serviceCalled(ev)
    );
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("device")) {
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

  protected render(): TemplateResult {
    return html`
      <ha-card .header=${this.device!.name}>
        <div class="card-content">
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

          <div class="device-entities">
            ${this.device!.entities.map(
              (entity) => html`
                <state-badge
                  @click="${this._openMoreInfo}"
                  title=${this._computeEntityName(entity)}
                  .stateObj="${this.hass!.states[entity.entity_id]}"
                  slot="item-icon"
                ></state-badge>
              `
            )}
          </div>
          <paper-input
            type="string"
            @change=${this._saveCustomName}
            .value=${this._userGivenName || this.device!.name}
            .label=${this.hass!.localize(
              "ui.dialogs.zha_device_info.zha_device_card.device_name_placeholder"
            )}
          ></paper-input>
          <ha-area-picker
            .hass=${this.hass}
            .device=${this.device!.device_reg_id}
            @value-changed=${this._areaPicked}
          ></ha-area-picker>
        </div>
      </ha-card>
    `;
  }

  private async _saveCustomName(event): Promise<void> {
    if (this.hass) {
      await updateDeviceRegistryEntry(this.hass, this.device!.device_reg_id, {
        name_by_user: event.target.value,
      });
      this.device!.user_given_name = event.target.value;
    }
  }

  private _openMoreInfo(ev: MouseEvent): void {
    fireEvent(this, "hass-more-info", {
      entityId: (ev.currentTarget as any).stateObj.entity_id,
    });
  }

  private _computeEntityName(entity: ZHAEntityReference): string {
    if (this.hass.states[entity.entity_id]) {
      return computeStateName(this.hass.states[entity.entity_id]);
    }
    return entity.name;
  }

  private async _areaPicked(ev: CustomEvent) {
    const picker = ev.currentTarget as any;

    const area = ev.detail.value;
    try {
      await updateDeviceRegistryEntry(this.hass, this.device!.device_reg_id, {
        area_id: area,
      });
      this.device!.area_id = area;
    } catch (err) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_flow.error_saving_area",
          "error",
          err.message
        ),
      });
      picker.value = null;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .device-entities {
          display: flex;
          flex-wrap: wrap;
          padding: 4px;
          justify-content: left;
          min-height: 48px;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-card": ZHADeviceCard;
  }
}
