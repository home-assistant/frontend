import { mdiDevices } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { getDeviceArea } from "../../common/entity/context/get_device_context";
import type { HomeAssistant } from "../../types";
import type { HassDialog } from "../../dialogs/make-dialog-manager";
import "../ha-dialog";
import "../ha-svg-icon";
import "../item/ha-list-item-button";
import "../list/ha-list-base";
import type { DeviceReplacedDialogParams } from "./show-dialog-device-replaced";

@customElement("dialog-device-replaced")
export class DialogDeviceReplaced
  extends LitElement
  implements HassDialog<DeviceReplacedDialogParams>
{
  @state() private _params?: DeviceReplacedDialogParams;

  @state() private _open = false;

  @property({ attribute: false }) public hass!: HomeAssistant;

  public async showDialog(params: DeviceReplacedDialogParams): Promise<void> {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _pick(ev: Event): void {
    const item = (ev.target as HTMLElement).closest("ha-list-item-button") as
      (HTMLElement & { deviceId?: string }) | null;
    if (!item?.deviceId) {
      return;
    }
    this._params?.onResolved(item.deviceId);
    this.closeDialog();
  }

  private _items = memoizeOne(
    (
      candidates: string[],
      primaryId: string | null,
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"]
    ) =>
      candidates.map((deviceId) => {
        const device = devices[deviceId];
        const area = device ? getDeviceArea(device, areas) : undefined;
        return {
          deviceId,
          name: device ? computeDeviceName(device) : deviceId,
          secondary: area ? computeAreaName(area) : undefined,
          isPrimary: deviceId === primaryId,
        };
      })
  );

  protected render() {
    if (!this._params || !this.hass) {
      return nothing;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        .headerTitle=${this.hass.localize(
          "ui.components.device-picker.replaced_dialog.title"
        )}
        @closed=${this._dialogClosed}
      >
        <p class="description">
          ${this.hass.localize(
            "ui.components.device-picker.replaced_dialog.description"
          )}
        </p>
        <ha-list-base @click=${this._pick}>
          ${this._items(
            this._params.candidates,
            this._params.primaryId,
            this.hass.devices,
            this.hass.areas
          ).map(
            (item) => html`
              <ha-list-item-button .deviceId=${item.deviceId}>
                <ha-svg-icon slot="start" .path=${mdiDevices}></ha-svg-icon>
                <span slot="headline">${item.name}</span>
                ${
                  item.secondary || item.isPrimary
                    ? html`<span slot="supporting-text">
                        ${[
                          item.secondary,
                          item.isPrimary
                            ? this.hass.localize(
                                "ui.components.device-picker.replaced_dialog.recommended"
                              )
                            : undefined,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>`
                    : nothing
                }
              </ha-list-item-button>
            `
          )}
        </ha-list-base>
      </ha-dialog>
    `;
  }

  static styles = css`
    ha-dialog {
      --dialog-content-padding: 0;
      --ha-row-item-padding-inline: var(--ha-space-6);
    }
    .description {
      margin: 0;
      padding: 0 var(--ha-space-6) var(--ha-space-4);
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-device-replaced": DialogDeviceReplaced;
  }
}
