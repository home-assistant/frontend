import { html, LitElement, TemplateResult, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import { HassDialog } from "../../../../../dialogs/make-dialog-manager";
import { changeZHANetworkChannel } from "../../../../../data/zha";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { HomeAssistant } from "../../../../../types";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-button";
import "../../../../../components/ha-select";
import "../../../../../components/ha-list-item";
import { ZHAChangeChannelDialogParams } from "./show-dialog-zha-change-channel";

const VALID_CHANNELS = [
  "auto",
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
];

@customElement("dialog-zha-change-channel")
class DialogZHAChangeChannel extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _migrationInProgress = false;

  @state() private _params?: ZHAChangeChannelDialogParams;

  @state() private _newChannel?: "auto" | number;

  public async showDialog(params: ZHAChangeChannelDialogParams): Promise<void> {
    this._params = params;
    this._newChannel = "auto";
  }

  public closeDialog(): void {
    this._params = undefined;
    this._newChannel = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.zha.change_channel_dialog.title")
        )}
      >
        <p>
          ${this.hass.localize(
            "ui.panel.config.zha.change_channel_dialog.migration_warning"
          )}
        </p>

        <p>
          <ha-select
            .label=${this.hass.localize(
              "ui.panel.config.zha.change_channel_dialog.new_channel"
            )}
            fixedMenuPosition
            naturalMenuWidth
            @selected=${this._newChannelChosen}
            @closed=${stopPropagation}
            .value=${String(this._newChannel)}
          >
            ${VALID_CHANNELS.map(
              (newChannel) =>
                html`<ha-list-item .value=${String(newChannel)}
                  >${newChannel}</ha-list-item
                >`
            )}
          </ha-select>
        </p>

        <ha-progress-button
          slot="primaryAction"
          .progress=${this._migrationInProgress}
          .disabled=${this._migrationInProgress}
          @click=${this._changeNetworkChannel}
        >
          ${this.hass.localize(
            "ui.panel.config.zha.change_channel_dialog.change_channel"
          )}
        </ha-progress-button>

        <ha-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          .disabled=${this._migrationInProgress}
          >${this.hass.localize("ui.dialogs.generic.cancel")}</ha-button
        >
      </ha-dialog>
    `;
  }

  private _newChannelChosen(evt: Event): void {
    const value: string = (evt.target! as HTMLSelectElement).value;
    this._newChannel = value === "auto" ? "auto" : parseInt(value, 10);
  }

  private async _changeNetworkChannel(): Promise<void> {
    try {
      this._migrationInProgress = true;
      await changeZHANetworkChannel(this.hass, this._newChannel!);
    } finally {
      this._migrationInProgress = false;
    }

    await showAlertDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.zha.change_channel_dialog.channel_has_been_changed"
      ),
      text: this.hass.localize(
        "ui.panel.config.zha.change_channel_dialog.devices_will_rejoin"
      ),
    });

    this.closeDialog();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zha-change-channel": DialogZHAChangeChannel;
  }
}
