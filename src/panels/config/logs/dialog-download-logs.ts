import { mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import "../../../components/ha-md-dialog";
import "../../../components/ha-button";
import "../../../components/ha-dialog-header";
import "../../../components/ha-icon-button";
import type { HaMdDialog } from "../../../components/ha-md-dialog";
import { HomeAssistant } from "../../../types";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import { fireEvent } from "../../../common/dom/fire_event";
import { DownloadLogsDialogParams } from "./show-dialog-download-logs";
import "../../../components/ha-select";
import "../../../components/ha-list-item";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { getHassioLogDownloadLinesUrl } from "../../../data/hassio/supervisor";
import { getSignedPath } from "../../../data/auth";
import { fileDownload } from "../../../util/file_download";

@customElement("dialog-download-logs")
class DownloadLogsDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: DownloadLogsDialogParams;

  @state() private _selectedNumberOfLines = 100;

  @query("ha-md-dialog") private _dialogElement!: HaMdDialog;

  public showDialog(dialogParams: DownloadLogsDialogParams) {
    this._dialogParams = dialogParams;
    this._selectedNumberOfLines = this._dialogParams?.numberOfLines ?? 100;
  }

  public closeDialog() {
    this._dialogElement.close();
  }

  private _dialogClosed() {
    this._dialogParams = undefined;
    this._selectedNumberOfLines = 100;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }

    const numberOfLinesOptions = [100, 500, 1000, 5000, 10000];
    if (!numberOfLinesOptions.includes(this._selectedNumberOfLines)) {
      numberOfLinesOptions.push(this._selectedNumberOfLines);
      numberOfLinesOptions.sort((a, b) => a - b);
    }

    return html`
      <ha-md-dialog open @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            @click=${this.closeDialog}
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title" id="dialog-light-color-favorite-title">
            ${this.hass.localize("ui.panel.config.logs.download_full_log")}
          </span>
          <span slot="subtitle"> ${this._dialogParams.header} </span>
        </ha-dialog-header>
        <div slot="content" class="content">
          <div>
            ${this.hass.localize(
              "ui.panel.config.logs.select_number_of_lines"
            )}:
          </div>
          <ha-select
            .label=${this.hass.localize("ui.panel.config.logs.lines")}
            @selected=${this._setNumberOfLogs}
            fixedMenuPosition
            naturalMenuWidth
            @closed=${stopPropagation}
            .value=${String(this._selectedNumberOfLines)}
          >
            ${numberOfLinesOptions.map(
              (option) => html`
                <ha-list-item .value=${String(option)}>
                  ${option}
                </ha-list-item>
              `
            )}
          </ha-select>
        </div>
        <div slot="actions">
          <ha-button @click=${this.closeDialog}>
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button @click=${this._dowloadLogs}>
            ${this.hass.localize("ui.common.download")}
          </ha-button>
        </div>
      </ha-md-dialog>
    `;
  }

  private async _dowloadLogs() {
    const provider = this._dialogParams!.provider;

    const timeString = new Date().toISOString().replace(/:/g, "-");
    const downloadUrl = getHassioLogDownloadLinesUrl(
      provider,
      this._selectedNumberOfLines
    );
    const logFileName =
      provider !== "core"
        ? `${provider}_${timeString}.log`
        : `home-assistant_${timeString}.log`;
    const signedUrl = await getSignedPath(this.hass, downloadUrl);
    fileDownload(signedUrl.path, logFileName);
    this.closeDialog();
  }

  private _setNumberOfLogs(ev) {
    this._selectedNumberOfLines = Number(ev.target.value);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        :host {
          direction: var(--direction);
        }
        .content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-download-logs": DownloadLogsDialog;
  }
}
