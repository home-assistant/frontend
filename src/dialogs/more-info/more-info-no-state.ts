import "@material/mwc-button/mwc-button";
import { mdiExclamationThick } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../components/ha-svg-icon";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
  updateDeviceRegistryEntry,
} from "../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
  updateEntityRegistryEntry,
} from "../../data/entity_registry";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { showDeviceRegistryDetailDialog } from "../../panels/config/devices/device-registry-detail/show-dialog-device-registry-detail";
import type { HomeAssistant } from "../../types";
import { showAlertDialog } from "../generic/show-dialog-box";

@customElement("more-info-no-state")
export class MoreInfoNoState extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @state() private _devices?: DeviceRegistryEntry[];

  @state() private _entities?: EntityRegistryEntry[];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection, (devices) => {
        this._devices = devices;
      }),
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities;
      }),
    ];
  }

  private getDeviceEntry = memoizeOne(
    (
      deviceId: string,
      devices?: DeviceRegistryEntry[]
    ): DeviceRegistryEntry | undefined =>
      devices?.find((device) => device.id === deviceId)
  );

  private getEntityEntry = memoizeOne(
    (
      entityId: string,
      entities?: EntityRegistryEntry[]
    ): EntityRegistryEntry | undefined =>
      entities?.find((entity) => entity.entity_id === entityId)
  );

  private _openDeviceSettings() {
    const entity = this.getEntityEntry(this.entityId, this._entities);

    if (!entity?.device_id) return;
    const device = this.getDeviceEntry(entity.device_id, this._devices);

    if (!device) return;

    showDeviceRegistryDetailDialog(this, {
      device: device,
      updateEntry: async (updates) => {
        await updateDeviceRegistryEntry(this.hass, device.id, updates);
      },
    });
  }

  private async _enableEntry() {
    const entity = this.getEntityEntry(this.entityId, this._entities);
    if (!entity) return;

    const result = await updateEntityRegistryEntry(
      this.hass!,
      entity.entity_id,
      { disabled_by: null }
    );

    if (result.require_restart) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.dialogs.entity_registry.editor.enabled_restart_confirm"
        ),
      });
    }
    if (result.reload_delay) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.dialogs.entity_registry.editor.enabled_delay_confirm",
          "delay",
          result.reload_delay
        ),
      });
    }
  }

  protected render() {
    const entityId = this.entityId;

    const entity = this.getEntityEntry(entityId, this._entities);
    const device = entity?.device_id
      ? this.getDeviceEntry(entity.device_id, this._devices)
      : undefined;

    return html`
        ${
          device?.disabled_by
            ? html`
                <div class="content">
                  <ha-svg-icon .path=${mdiExclamationThick}></ha-svg-icon>
                  <p>
                    ${this.hass!.localize(
                      "ui.dialogs.entity_registry.editor.device_disabled"
                    )}
                  </p>
                  <mwc-button @click=${this._openDeviceSettings}>
                    ${this.hass!.localize(
                      "ui.dialogs.entity_registry.editor.open_device_settings"
                    )}
                  </mwc-button>
                </div>
              `
            : entity?.disabled_by
            ? html`
                <div class="content">
                  <ha-svg-icon .path=${mdiExclamationThick}></ha-svg-icon>
                  <p>
                    ${this.hass!.localize(
                      "ui.dialogs.entity_registry.editor.entity_disabled"
                    )}
                  </p>
                  ${["user", "integration"].includes(entity.disabled_by!)
                    ? html`
                        <mwc-button @click=${this._enableEntry}>
                          ${this.hass!.localize(
                            "ui.dialogs.entity_registry.editor.enable_entity"
                          )}</mwc-button
                        >
                      `
                    : nothing}
                </div>
              `
            : html`
                <div class="content">
                  <ha-svg-icon .path=${mdiExclamationThick}></ha-svg-icon>
                  <p>
                    ${this.hass!.localize(
                      "ui.dialogs.entity_registry.editor.unavailable"
                    )}
                  </p>
                </div>
              `
        }
      </div>
    `;
  }

  static get styles() {
    return css`
      .content {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 24px 24px 24px;
      }
      .content ha-svg-icon {
        background-color: var(--warning-color);
        color: white;
        padding: 16px;
        border-radius: 50%;
        margin-bottom: 8px;
      }
      .content p {
        font-weight: 400;
        font-size: 14px;
        line-height: 20px;
        letter-spacing: 0.25px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-no-state": MoreInfoNoState;
  }
}
