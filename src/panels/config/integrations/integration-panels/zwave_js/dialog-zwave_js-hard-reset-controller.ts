import { mdiDeleteForever } from "@mdi/js";
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

@customElement("dialog-zwave_js-hard-reset-controller")
class DialogZWaveJSHardResetController extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private entry_id?: string;

  @state() private _done = false;

  public showDialog(params: ZWaveJSHardResetControllerDialogParams): void {
    this.entry_id = params.entryId;
  }

  public closeDialog(): void {
    this.entry_id = undefined;
    this._done = false;

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this.entry_id) {
      return nothing;
    }

    return html` <ha-dialog
      open
      @closed=${this.closeDialog}
      .heading=${createCloseHeading(
        this.hass,
        this.hass.localize(
          `ui.panel.config.zwave_js.hard_reset_controller.title_${
            this._done ? "done" : "not_done"
          }`
        )
      )}
    >
      ${!this._done
        ? html`<p>
            ${this.hass.localize(
              `ui.panel.config.zwave_js.hard_reset_controller.success`
            )}
          </p>`
        : html`<div class="flex-container">
              <div>
                <ha-svg-icon
                  .path=${mdiDeleteForever}
                  .class="icon"
                ></ha-svg-icon>
              </div>
              <p>
                ${this.hass.localize(
                  `ui.panel.config.zwave_js.hard_reset_controller.dialog_body`
                )}
              </p>
            </div>
            <mwc-button
              slot="primaryAction"
              @click=${this._hardResetController}
            >
              ${this.hass.localize("ui.common.continue")}
            </mwc-button>
            <mwc-button slot="secondaryAction" @click=${this.closeDialog}>
              ${this.hass.localize("ui.common.cancel")}
            </mwc-button>`}
    </ha-dialog>`;
  }

  private async _hardResetController(): Promise<void> {
    if (
      await showConfirmationDialog(this, {
        text: this.hass.localize(
          `ui.panel.config.zwave_js.hard_reset_controller.final_warning`
        ),
        dismissText: this.hass.localize("ui.common.cancel"),
        confirmText: this.hass.localize("ui.common.continue"),
      })
    ) {
      await hardResetController(this.hass, this.entry_id!);
      this._done = true;
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
