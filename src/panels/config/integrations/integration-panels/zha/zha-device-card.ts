import "@polymer/paper-input/paper-input";
import "@polymer/paper-listbox/paper-listbox";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeStateName } from "../../../../../common/entity/compute_state_name";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/entity/state-badge";
import "../../../../../components/ha-card";
import "../../../../../components/ha-service-description";
import { updateDeviceRegistryEntry } from "../../../../../data/device_registry";
import { ZHADevice } from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import "../../../../../components/ha-area-picker";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import {
  subscribeEntityRegistry,
  EntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../../../data/entity_registry";
import memoizeOne from "memoize-one";
import { EntityRegistryStateEntry } from "../../../devices/ha-config-device-page";
import { compare } from "../../../../../common/string/compare";
import { getIeeeTail } from "./functions";
import { slugify } from "../../../../../common/string/slugify";

@customElement("zha-device-card")
class ZHADeviceCard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device?: ZHADevice;

  @property({ type: Boolean }) public narrow?: boolean;

  @internalProperty() private _entities: EntityRegistryEntry[] = [];

  private _deviceEntities = memoizeOne(
    (
      deviceId: string,
      entities: EntityRegistryEntry[]
    ): EntityRegistryStateEntry[] =>
      entities
        .filter((entity) => entity.device_id === deviceId)
        .map((entity) => {
          return { ...entity, stateName: this._computeEntityName(entity) };
        })
        .sort((ent1, ent2) =>
          compare(
            ent1.stateName || `zzz${ent1.entity_id}`,
            ent2.stateName || `zzz${ent2.entity_id}`
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

  protected render(): TemplateResult {
    if (!this.hass || !this.device) {
      return html``;
    }
    const entities = this._deviceEntities(
      this.device.device_reg_id,
      this._entities
    );

    return html`
      <ha-card .header=${this.device.user_given_name || this.device.name}>
        <div class="card-content">
          <div class="info">
            <div class="model">${this.device.model}</div>
            <div class="manuf">
              ${this.hass.localize(
                "ui.dialogs.zha_device_info.manuf",
                "manufacturer",
                this.device.manufacturer
              )}
            </div>
          </div>

          <div class="device-entities">
            ${entities.map(
              (entity) => html`
                <state-badge
                  @click="${this._openMoreInfo}"
                  .title=${entity.stateName!}
                  .stateObj="${this.hass!.states[entity.entity_id]}"
                  slot="item-icon"
                ></state-badge>
              `
            )}
          </div>
          <paper-input
            type="string"
            @change=${this._rename}
            .value=${this.device.user_given_name || this.device.name}
            .label=${this.hass.localize(
              "ui.dialogs.zha_device_info.zha_device_card.device_name_placeholder"
            )}
          ></paper-input>
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
    const device = this.device;

    const oldDeviceName = device.user_given_name || device.name;
    const newDeviceName = event.target.value;
    this.device.user_given_name = newDeviceName;
    await updateDeviceRegistryEntry(this.hass, device.device_reg_id, {
      name_by_user: newDeviceName,
    });

    if (!oldDeviceName || !newDeviceName || oldDeviceName === newDeviceName) {
      return;
    }
    const entities = this._deviceEntities(device.device_reg_id, this._entities);

    const oldDeviceEntityId = slugify(oldDeviceName);
    const newDeviceEntityId = slugify(newDeviceName);
    const ieeeTail = getIeeeTail(device.ieee);

    const updateProms = entities.map((entity) => {
      const name = entity.name || entity.stateName;
      let newEntityId: string | null = null;
      let newName: string | null = null;

      if (name && name.includes(oldDeviceName)) {
        newName = name.replace(` ${ieeeTail}`, "");
        newName = newName.replace(oldDeviceName, newDeviceName);
        newEntityId = entity.entity_id.replace(`_${ieeeTail}`, "");
        newEntityId = newEntityId.replace(oldDeviceEntityId, newDeviceEntityId);
      }

      if (!newName && !newEntityId) {
        return new Promise((resolve) => resolve());
      }

      return updateEntityRegistryEntry(this.hass!, entity.entity_id, {
        name: newName || name,
        disabled_by: entity.disabled_by,
        new_entity_id: newEntityId || entity.entity_id,
      });
    });
    await Promise.all(updateProms);
  }

  private _openMoreInfo(ev: MouseEvent): void {
    fireEvent(this, "hass-more-info", {
      entityId: (ev.currentTarget as any).stateObj.entity_id,
    });
  }

  private _computeEntityName(entity: EntityRegistryEntry): string {
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
        state-badge {
          cursor: pointer;
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
