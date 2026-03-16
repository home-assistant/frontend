import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeEntityEntryName } from "../../../../../common/entity/compute_entity_name";
import { stringCompare } from "../../../../../common/string/compare";
import "../../../../../components/entity/state-badge";
import "../../../../../components/ha-area-picker";
import "../../../../../components/ha-card";
import "../../../../../components/ha-textfield";
import { updateDeviceRegistryEntry } from "../../../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../../../data/entity/entity_registry";
import { subscribeEntityRegistry } from "../../../../../data/entity/entity_registry";
import type { ZHADevice } from "../../../../../data/zha";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { EntityRegistryEntryWithDisplayName } from "../../../devices/ha-config-device-page";

@customElement("zha-device-card")
class ZHADeviceCard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device?: ZHADevice;

  @property({ type: Boolean }) public narrow = false;

  @state() private _entities: EntityRegistryEntry[] = [];

  private _deviceEntities = memoizeOne(
    (
      deviceId: string,
      entities: EntityRegistryEntry[]
    ): EntityRegistryEntryWithDisplayName[] =>
      entities
        .filter((entity) => entity.device_id === deviceId)
        .map((entity) => ({
          ...entity,
          display_name: computeEntityEntryName(entity),
        }))
        .sort((ent1, ent2) =>
          stringCompare(
            ent1.display_name || "",
            ent2.display_name || "",
            this.hass.locale.language
          )
        )
  );

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection, (entities) => {
        this._entities = entities;
      }),
    ];
  }

  protected render() {
    if (!this.hass || !this.device) {
      return nothing;
    }
    const entities = this._deviceEntities(
      this.device.device_reg_id,
      this._entities
    );

    return html`
      <ha-card>
        <div class="card-content">
          <div>
            <div class="model">${this.device.model}</div>
            <div class="manuf">
              ${this.hass.localize("ui.dialogs.zha_device_info.manuf", {
                manufacturer: this.device.manufacturer,
              })}
            </div>
          </div>

          <div class="device-entities">
            ${entities.map((entity) =>
              !entity.disabled_by
                ? html`
                    <state-badge
                      @click=${this._openMoreInfo}
                      .title=${entity.display_name || ""}
                      .hass=${this.hass}
                      .stateObj=${this.hass!.states[entity.entity_id]}
                      slot="item-icon"
                    ></state-badge>
                  `
                : ""
            )}
          </div>
          <ha-textfield
            type="string"
            @change=${this._rename}
            .value=${this.device.user_given_name || this.device.name}
            .label=${this.hass.localize(
              "ui.dialogs.zha_device_info.zha_device_card.device_name_placeholder"
            )}
          ></ha-textfield>
          <ha-area-picker
            .hass=${this.hass}
            .device=${this.device.device_reg_id}
            @value-changed=${this._areaPicked}
          ></ha-area-picker>
        </div>
      </ha-card>
    `;
  }

  private async _rename(event): Promise<void> {
    if (!this.hass || !this.device) {
      return;
    }
    const newDeviceName = event.target.value;
    this.device.user_given_name = newDeviceName;
    await updateDeviceRegistryEntry(this.hass, this.device.device_reg_id, {
      name_by_user: newDeviceName,
    });
  }

  private _openMoreInfo(ev: MouseEvent): void {
    fireEvent(this, "hass-more-info", {
      entityId: (ev.currentTarget as any).stateObj.entity_id,
    });
  }

  private async _areaPicked(ev: CustomEvent) {
    const picker = ev.currentTarget as any;

    const area = ev.detail.value;
    try {
      await updateDeviceRegistryEntry(this.hass, this.device!.device_reg_id, {
        area_id: area,
      });
      this.device!.area_id = area;
    } catch (err: any) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_flow.error_saving_device",
          { error: err.message }
        ),
      });
      picker.value = null;
    }
  }

  static get styles(): CSSResultGroup {
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
          font-weight: var(--ha-font-weight-bold);
        }
        .device .manuf {
          color: var(--secondary-text-color);
          margin-bottom: 20px;
          word-wrap: break-word;
        }
        .extra-info {
          margin-top: 8px;
          word-wrap: break-word;
        }
        state-badge {
          cursor: pointer;
        }

        ha-card {
          border: none;
        }
        ha-textfield {
          width: 100%;
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
