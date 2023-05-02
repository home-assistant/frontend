import { html, LitElement, TemplateResult, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { HassDialog } from "../../../../../dialogs/make-dialog-manager";
import { changeZHANetworkChannel } from "../../../../../data/zha";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { HomeAssistant } from "../../../../../types";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-select";
import "@material/mwc-list/mwc-list-item";
import { ZHAMigrateChannelDialogParams } from "./show-dialog-zha-migrate-channel";

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
];

@customElement("dialog-zha-migrate-channel")
class DialogZHAMigrateChannel extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _migrationInProgress = false;

  @state() private _params?: ZHAMigrateChannelDialogParams;

  private _newChannel: "auto" | number = "auto";

  public async showDialog(
    params: ZHAMigrateChannelDialogParams
  ): Promise<void> {
    this._params = params;
  }

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        hideActions
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
            name="newChannel"
            fixedMenuPosition
            dialogInitialFocus
            naturalMenuWidth
            @change=${this._newChannelChosen}
            value="auto"
          >
            ${VALID_CHANNELS.map(
              (newChannel) =>
                html`<mwc-list-item .value=${newChannel.toString()}
                  >${newChannel}</mwc-list-item
                >`
            )}
          </ha-select>
        </p>

        <ha-progress-button
          .progress=${this._migrationInProgress}
          .disabled=${this._migrationInProgress}
          @click=${this._changeNetworkChannel}
        >
          ${this.hass.localize(
            "ui.panel.config.zha.change_channel_dialog.change_channel"
          )}
        </ha-progress-button>
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
      await changeZHANetworkChannel(this.hass, this._newChannel);
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
    "dialog-zha-migrate-channel": DialogZHAMigrateChannel;
  }
}
