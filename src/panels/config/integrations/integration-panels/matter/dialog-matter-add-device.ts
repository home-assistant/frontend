import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { dynamicElement } from "../../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-icon-button-arrow-prev";
import "../../../../../components/ha-button";
import "../../../../../components/ha-wa-dialog";
import {
  commissionMatterDevice,
  redirectOnNewMatterDevice,
} from "../../../../../data/matter";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "./matter-add-device/matter-add-device-apple-home";
import "./matter-add-device/matter-add-device-existing";
import "./matter-add-device/matter-add-device-generic";
import "./matter-add-device/matter-add-device-google-home";
import "./matter-add-device/matter-add-device-google-home-fallback";
import "./matter-add-device/matter-add-device-main";
import "./matter-add-device/matter-add-device-new";
import "./matter-add-device/matter-add-device-commissioning";
import { showToast } from "../../../../../util/toast";

export type MatterAddDeviceStep =
  | "main"
  | "new"
  | "existing"
  | "google_home"
  | "google_home_fallback"
  | "apple_home"
  | "generic"
  | "commissioning";

declare global {
  interface HASSDomEvents {
    "step-selected": { step: MatterAddDeviceStep };
    "pairing-code-changed": { code: string };
  }
}

const BACK_STEP: Record<MatterAddDeviceStep, MatterAddDeviceStep | undefined> =
  {
    main: undefined,
    new: "main",
    existing: "main",
    google_home: "existing",
    google_home_fallback: "google_home",
    apple_home: "existing",
    generic: "existing",
    commissioning: undefined,
  };

@customElement("dialog-matter-add-device")
class DialogMatterAddDevice extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() _pairingCode = "";

  @state() _step: MatterAddDeviceStep = "main";

  private _unsub?: UnsubscribeFunc;

  public showDialog(): void {
    this._open = true;
    this._unsub = redirectOnNewMatterDevice(this.hass, () =>
      this.closeDialog()
    );
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._step = "main";
    this._pairingCode = "";
    this._unsub?.();
    this._unsub = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _handleStepSelected(ev: CustomEvent) {
    this._step = ev.detail.step;
    this._pairingCode = "";
  }

  private _handlePairingCodeChanged(ev: CustomEvent) {
    this._pairingCode = ev.detail.code;
  }

  private _back() {
    const backStep = BACK_STEP[this._step];
    if (!backStep) return;
    this._step = backStep;
  }

  private _renderStep() {
    return html`
      <div
        @pairing-code-changed=${this._handlePairingCodeChanged}
        @step-selected=${this._handleStepSelected}
        .hass=${this.hass}
      >
        ${dynamicElement(
          `matter-add-device-${this._step.replaceAll("_", "-")}`,
          {
            hass: this.hass,
          }
        )}
      </div>
    `;
  }

  private async _addDevice() {
    const code = this._pairingCode;
    const savedStep = this._step;
    try {
      this._step = "commissioning";
      await commissionMatterDevice(this.hass, code);
    } catch (_err) {
      showToast(this, {
        message: this.hass.localize(
          "ui.dialogs.matter-add-device.add_device_failed"
        ),
        duration: 2000,
      });
    }
    this._step = savedStep;
  }

  private _renderActions() {
    if (
      this._step === "apple_home" ||
      this._step === "google_home_fallback" ||
      this._step === "generic"
    ) {
      return html`
        <ha-button
          slot="primaryAction"
          @click=${this._addDevice}
          .disabled=${!this._pairingCode}
        >
          ${this.hass.localize("ui.dialogs.matter-add-device.add_device")}
        </ha-button>
      `;
    }
    if (this._step === "new") {
      return html`
        <ha-button slot="primaryAction" @click=${this.closeDialog}>
          ${this.hass.localize("ui.common.ok")}
        </ha-button>
      `;
    }
    return nothing;
  }

  protected render() {
    if (!this._open) {
      return nothing;
    }

    const title = this.hass.localize(
      `ui.dialogs.matter-add-device.${this._step}.header`
    );

    const hasBackStep = BACK_STEP[this._step];

    const actions = this._renderActions();

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${title}
        prevent-scrim-close
        @closed=${this._dialogClosed}
      >
        ${hasBackStep
          ? html`
              <ha-icon-button-arrow-prev
                slot="headerNavigationIcon"
                .hass=${this.hass}
                @click=${this._back}
              ></ha-icon-button-arrow-prev>
            `
          : nothing}
        ${this._renderStep()}
        ${actions === nothing
          ? nothing
          : html`<ha-dialog-footer slot="footer">
              ${actions}
            </ha-dialog-footer>`}
      </ha-wa-dialog>
    `;
  }

  static styles = [
    haStyleDialog,
    css`
      :host {
        --horizontal-padding: 24px;
      }
      ha-wa-dialog {
        --dialog-content-padding: 0;
      }
      @media all and (max-width: 450px), all and (max-height: 500px) {
        :host {
          --horizontal-padding: 16px;
        }
      }
      .loading {
        padding: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-add-device": DialogMatterAddDevice;
  }
}
