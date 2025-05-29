import { mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog-header";
import "../../../components/ha-icon-button";
import "../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../components/ha-md-dialog";
import "../../../components/ha-md-select";
import "../../../components/ha-md-select-option";
import { getSignedPath } from "../../../data/auth";
import { getHassioLogDownloadLinesUrl } from "../../../data/hassio/supervisor";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { fileDownload } from "../../../util/file_download";
import type { DownloadLogsDialogParams } from "./show-dialog-download-logs";

const DEFAULT_LINE_COUNT = 500;

@customElement("dialog-download-logs")
class DownloadLogsDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: DownloadLogsDialogParams;

  @state() private _lineCount = DEFAULT_LINE_COUNT;

  @query("ha-md-dialog") private _dialogElement!: HaMdDialog;

  public showDialog(dialogParams: DownloadLogsDialogParams) {
    this._dialogParams = dialogParams;
    this._lineCount = this._dialogParams?.defaultLineCount || 500;
  }

  public closeDialog() {
    this._dialogElement.close();
  }

  private _dialogClosed() {
    this._dialogParams = undefined;
    this._lineCount = DEFAULT_LINE_COUNT;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }

    const numberOfLinesOptions = [100, 500, 1000, 5000, 10000];
    if (!numberOfLinesOptions.includes(this._lineCount) && this._lineCount) {
      numberOfLinesOptions.push(this._lineCount);
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
            ${this.hass.localize("ui.panel.config.logs.download_logs")}
          </span>
          <span slot="subtitle">
            ${this._dialogParams.header}${this._dialogParams.boot === 0
              ? ""
              : ` · ${this._dialogParams.boot === -1 ? this.hass.localize("ui.panel.config.logs.previous") : this.hass.localize("ui.panel.config.logs.startups_ago", { boot: this._dialogParams.boot * -1 })}`}
          </span>
        </ha-dialog-header>
        <div slot="content" class="content">
          <div>
            ${this.hass.localize(
              "ui.panel.config.logs.select_number_of_lines"
            )}:
          </div>
          <ha-md-select
            .label=${this.hass.localize("ui.panel.config.logs.lines")}
            @change=${this._setNumberOfLogs}
            .value=${String(this._lineCount)}
          >
            ${numberOfLinesOptions.map(
              (option) => html`
                <ha-md-select-option .value=${String(option)}>
                  ${option}
                </ha-md-select-option>
              `
            )}
          </ha-md-select>
        </div>
        <div slot="actions">
          <ha-button @click=${this.closeDialog}>
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button @click=${this._downloadLogs}>
            ${this.hass.localize("ui.common.download")}
          </ha-button>
        </div>
      </ha-md-dialog>
    `;
  }

  private async _downloadLogs() {
    const provider = this._dialogParams!.provider;
    const boot = this._dialogParams!.boot;

    const timeString = new Date().toISOString().replace(/:/g, "-");
    const downloadUrl = getHassioLogDownloadLinesUrl(
      provider,
      this._lineCount,
      boot
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
    this._lineCount = Number(ev.target.value);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        :host {
          direction: var(--direction);
          --dialog-content-overflow: visible;
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
