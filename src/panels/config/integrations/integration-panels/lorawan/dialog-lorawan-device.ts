import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { ContextType } from "@lit/context";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../../../common/decorators/consume";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-button";
import {
  internationalizationContext,
  connectionContext,
} from "../../../../../data/context";
import { subscribeLoRaWANDevices } from "../../../../../data/lorawan";
import type { LoRaWANDevice } from "../../../../../data/lorawan";
import { DialogMixin } from "../../../../../dialogs/dialog-mixin";
import "./lorawan-device-details";

@customElement("dialog-lorawan-device")
class DialogLoRaWANDevice extends DialogMixin<{ device: LoRaWANDevice }>(
  LitElement
) {
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  private _unsubscribe?: Promise<UnsubscribeFunc>;
  @state() private _device?: LoRaWANDevice;

  protected firstUpdated() {
    this._unsubscribe = subscribeLoRaWANDevices(
      this._connection.connection,
      ({ devices }) => {
        this._device = devices.find(
          (device) =>
            device.dev_eui === this.params!.device.dev_eui &&
            device.connection.entry_id ===
              this.params!.device.connection.entry_id
        );
      }
    );
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe?.then((unsubscribe) => unsubscribe());
  }

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  protected render() {
    if (!this.params) return nothing;
    const device = this._device ?? this.params.device;
    return html`<ha-dialog
      open
      width="medium"
      .headerTitle=${device.name || device.dev_eui}
      .headerSubtitle=${device.model}
    >
      ${device.support === "supported" ? nothing : html`<ha-alert alert-type="info">${this._i18n.localize(`ui.panel.config.lorawan.support.${device.support}`)}</ha-alert>`}
      <lorawan-device-details .device=${device}></lorawan-device-details>
      <ha-dialog-footer slot="footer"
        ><ha-button
          slot="primaryAction"
          appearance="plain"
          @click=${this.closeDialog}
          >${this._i18n.localize("ui.common.close")}</ha-button
        ></ha-dialog-footer
      >
    </ha-dialog>`;
  }

  static styles = css`
    ha-dialog {
      --dialog-content-padding: 0;
    }
    ha-alert {
      --ha-border-radius-sm: 0;
      --ha-alert-padding: var(--ha-space-3) var(--ha-space-6);
    }
    lorawan-device-details {
      padding: var(--ha-space-6);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-lorawan-device": DialogLoRaWANDevice;
  }
}
