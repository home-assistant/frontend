import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-select";
import "../../../components/ha-wa-dialog";
import { getSignedPath } from "../../../data/auth";
import { getHassioLogDownloadLinesUrl } from "../../../data/hassio/supervisor";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import { fileDownload } from "../../../util/file_download";
import type { DownloadLogsDialogParams } from "./show-dialog-download-logs";

const DEFAULT_LINE_COUNT = 500;

@customElement("dialog-download-logs")
class DownloadLogsDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: DownloadLogsDialogParams;

  @state() private _open = false;

  @state() private _lineCount = DEFAULT_LINE_COUNT;

  public showDialog(dialogParams: DownloadLogsDialogParams) {
    this._dialogParams = dialogParams;
    this._lineCount =
      this._dialogParams?.defaultLineCount || DEFAULT_LINE_COUNT;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
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

    const headerSubtitle = `${this._dialogParams.header}${
      this._dialogParams.boot === 0
        ? ""
        : ` · ${
            this._dialogParams.boot === -1
              ? this.hass.localize("ui.panel.config.logs.previous")
              : this.hass.localize("ui.panel.config.logs.startups_ago", {
                  boot: this._dialogParams.boot * -1,
                })
          }`
    }`;

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize("ui.panel.config.logs.download_logs")}
        header-subtitle=${headerSubtitle}
        width="small"
        @closed=${this._dialogClosed}
      >
        <div class="content">
          <div>
            ${this.hass.localize(
              "ui.panel.config.logs.select_number_of_lines"
            )}:
          </div>
          <ha-select
            .label=${this.hass.localize("ui.panel.config.logs.lines")}
            @selected=${this._setNumberOfLogs}
            .value=${String(this._lineCount)}
            .options=${numberOfLinesOptions.map((option) => String(option))}
          ></ha-select>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._downloadLogs}>
            ${this.hass.localize("ui.common.download")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
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

  private _setNumberOfLogs(ev: ValueChangedEvent<string>) {
    this._lineCount = Number(ev.detail.value);
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
          gap: var(--ha-space-2);
        }
        ha-select {
          width: 100%;
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
