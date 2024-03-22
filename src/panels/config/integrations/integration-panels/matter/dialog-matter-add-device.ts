import { mdiClose } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { dynamicElement } from "../../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-circular-progress";
import "../../../../../components/ha-dialog-header";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-icon-button-arrow-prev";
import {
  acceptSharedMatterDevice,
  canCommissionMatterExternal,
  redirectOnNewMatterDevice,
} from "../../../../../data/matter";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import "./matter-add-device/matter-add-device-apple-home-code";
import "./matter-add-device/matter-add-device-existing";
import "./matter-add-device/matter-add-device-google-home-code";
import "./matter-add-device/matter-add-device-google-home-link";
import "./matter-add-device/matter-add-device-main";
import "./matter-add-device/matter-add-device-new";
import "./matter-add-device/matter-add-device-others-code";

export type MatterAddDeviceStep =
  | "main"
  | "new"
  | "existing"
  | "google_home_link"
  | "google_home_code"
  | "apple_home_code"
  | "others_code";

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
    google_home_link: "existing",
    google_home_code: "google_home_link",
    apple_home_code: "existing",
    others_code: "existing",
  };

@customElement("dialog-matter-add-device")
class DialogMatterAddDevice extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() _pairingCode = "";

  @state() _step: MatterAddDeviceStep = "main";

  @state() _isSubmitting = false;

  private _unsub?: UnsubscribeFunc;

  public showDialog(): void {
    this._open = true;
    if (!canCommissionMatterExternal(this.hass)) {
      return;
    }
    this._unsub = redirectOnNewMatterDevice(this.hass, () =>
      this.closeDialog()
    );
  }

  public closeDialog(): void {
    this._open = false;
    this._step = "main";
    this._pairingCode = "";
    this._isSubmitting = false;
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

  private _addDevice() {
    const pin = Number(this._pairingCode.replaceAll("-", ""));
    if (isNaN(pin)) {
      throw new Error("Invalid pin format");
    }
    acceptSharedMatterDevice(this.hass, pin);
    this._isSubmitting = true;
  }

  private _renderActions() {
    if (
      this._step === "apple_home_code" ||
      this._step === "google_home_code" ||
      this._step === "others_code"
    ) {
      return html`
        <ha-button slot="primaryAction" @click=${this._addDevice}>
          Add device
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
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${title}
        ?hideActions=${actions === nothing}
      >
        <ha-dialog-header slot="heading">
          ${hasBackStep
            ? html`
                <ha-icon-button-arrow-prev
                  slot="navigationIcon"
                  .hass=${this.hass}
                  @click=${this._back}
                ></ha-icon-button-arrow-prev>
              `
            : html`
                <ha-icon-button
                  slot="navigationIcon"
                  dialogAction="cancel"
                  .label=${this.hass.localize("ui.common.close")}
                  .path=${mdiClose}
                ></ha-icon-button>
              `}
          <span slot="title">${title}</span>
        </ha-dialog-header>
        ${this._renderStep()} ${actions}
      </ha-dialog>
    `;
  }

  static styles = [
    haStyleDialog,
    css`
      ha-dialog {
        --dialog-content-padding: 0;
      }
      ha-dialog {
        --mdc-dialog-min-width: 450px;
        --mdc-dialog-max-width: 450px;
      }
      @media all and (max-width: 450px), all and (max-height: 500px) {
        ha-dialog {
          --mdc-dialog-min-width: calc(
            100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
          );
          --mdc-dialog-max-width: calc(
            100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
          );
        }
      }
      div {
        display: grid;
      }
      ha-circular-progress {
        justify-self: center;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-add-device": DialogMatterAddDevice;
  }
}
