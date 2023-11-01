import { mdiCheckCircle, mdiDeleteForever, mdiRestore } from "@mdi/js";
import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-svg-icon";
import { hardResetController } from "../../../../../data/zwave_js";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSHardResetControllerDialogParams } from "./show-dialog-zwave_js-hard-reset-controller";
import { showConfirmationDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { navigate } from "../../../../../common/navigate";

enum ResetStatus {
  NotStarted,
  InProgress,
  Done,
}

const iconMap = {
  [ResetStatus.NotStarted]: mdiDeleteForever,
  [ResetStatus.InProgress]: mdiRestore,
  [ResetStatus.Done]: mdiCheckCircle,
};

@customElement("dialog-zwave_js-hard-reset-controller")
class DialogZWaveJSHardResetController extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entryId?: string;

  @state() private _resetStatus = ResetStatus.NotStarted;

  public showDialog(params: ZWaveJSHardResetControllerDialogParams): void {
    this._entryId = params.entryId;
  }

  public closeDialog(): void {
    this._entryId = undefined;
    this._resetStatus = ResetStatus.NotStarted;

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._entryId) {
      return nothing;
    }

    return html`<ha-dialog
      open
      @closed=${this.closeDialog}
      .heading=${createCloseHeading(
        this.hass,
        this.hass.localize(
          `ui.panel.config.zwave_js.hard_reset_controller.${
            ResetStatus[this._resetStatus]
          }.title`
        )
      )}
    >
      <div class="flex-container">
        <div>
          <ha-svg-icon
            .path=${iconMap[this._resetStatus]}
            .class="icon"
          ></ha-svg-icon>
        </div>
        <p>
          ${this.hass.localize(
            `ui.panel.config.zwave_js.hard_reset_controller.${
              ResetStatus[this._resetStatus]
            }.body`
          )}
        </p>
      </div>
      ${this._resetStatus === ResetStatus.NotStarted
        ? html`<mwc-button
              slot="primaryAction"
              @click=${this._hardResetController}
            >
              ${this.hass.localize("ui.common.continue")}
            </mwc-button>
            <mwc-button slot="secondaryAction" @click=${this.closeDialog}>
              ${this.hass.localize("ui.common.cancel")}
            </mwc-button>`
        : nothing}
    </ha-dialog>`;
  }

  private async _hardResetController(): Promise<void> {
    if (
      await showConfirmationDialog(this, {
        text: this.hass.localize(
          `ui.panel.config.zwave_js.hard_reset_controller.confirmation`
        ),
        dismissText: this.hass.localize("ui.common.cancel"),
        confirmText: this.hass.localize("ui.common.continue"),
        destructive: true,
      })
    ) {
      this._resetStatus = ResetStatus.InProgress;
      const deviceId = await hardResetController(this.hass, this._entryId!);
      setTimeout(() => navigate(`/config/devices/device/${deviceId}`), 0);
      this._resetStatus = ResetStatus.Done;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .icon {
          color: var(--label-badge-red);
        }
        .flex-container {
          display: flex;
          align-items: center;
          margin-bottom: 5px;
        }

        ha-svg-icon {
          width: 68px;
          height: 48px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zwave_js-hard-reset-controller": DialogZWaveJSHardResetController;
  }
}
