import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-markdown-element";
import "../../../../components/ha-wa-dialog";
import "../../../../components/ha-select";
import "../../../../components/ha-spinner";
import "../../../../components/ha-textarea";
import { fetchSupportPackage } from "../../../../data/cloud";
import type { HomeAssistant } from "../../../../types";
import { fileDownload } from "../../../../util/file_download";

@customElement("dialog-cloud-support-package")
export class DialogSupportPackage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _supportPackage?: string;

  public showDialog() {
    this._open = true;
    this._loadSupportPackage();
  }

  private _dialogClosed(): void {
    this._open = false;
    this._supportPackage = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  protected render() {
    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        width="full"
        header-title="Download support package"
        @closed=${this._dialogClosed}
      >
        ${this._supportPackage
          ? html`<ha-markdown-element
              .content=${this._supportPackage}
              breaks
            ></ha-markdown-element>`
          : html`
              <div class="progress-container">
                <ha-spinner></ha-spinner>
                Generating preview...
              </div>
            `}
        <div slot="footer" class="footer">
          <ha-alert>
            This file may contain personal data about your home. Avoid sharing
            them with unverified or untrusted parties.
          </ha-alert>
          <hr />
          <ha-dialog-footer>
            <ha-button
              slot="secondaryAction"
              appearance="plain"
              @click=${this.closeDialog}
            >
              Close
            </ha-button>
            <ha-button slot="primaryAction" @click=${this._download}>
              Download
            </ha-button>
          </ha-dialog-footer>
        </div>
      </ha-wa-dialog>
    `;
  }

  private async _loadSupportPackage() {
    this._supportPackage = await fetchSupportPackage(this.hass);
  }

  private async _download() {
    fileDownload(
      "data:text/plain;charset=utf-8," +
        encodeURIComponent(this._supportPackage || ""),
      "support-package.md"
    );
  }

  static styles = css`
    .progress-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: calc(90vh - 260px);
      width: 100%;
    }

    .footer {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      gap: var(--ha-space-3);
      width: 100%;
    }
    ha-dialog-footer {
      display: block;
      width: 100%;
    }
    hr {
      border: none;
      border-top: 1px solid var(--divider-color);
      width: 100%;
      margin: 0;
    }
    table,
    th,
    td {
      border: none;
    }

    table {
      width: 100%;
      display: table;
      border-collapse: collapse;
      border-spacing: 0;
    }

    table tr {
      border-bottom: none;
    }

    table > tbody > tr:nth-child(odd) {
      background-color: rgba(var(--rgb-primary-text-color), 0.04);
    }

    table > tbody > tr > td {
      border-radius: var(--ha-border-radius-square);
    }

    table > tbody > tr {
      -webkit-transition: background-color 0.25s ease;
      transition: background-color 0.25s ease;
    }

    table > tbody > tr:hover {
      background-color: rgba(var(--rgb-primary-text-color), 0.08);
    }

    tr {
      border-bottom: 1px solid var(--divider-color);
    }

    td,
    th {
      padding: 15px 5px;
      display: table-cell;
      text-align: left;
      vertical-align: middle;
      border-radius: var(--ha-border-radius-sm);
    }
    details {
      background-color: var(--secondary-background-color);
      padding: 16px 24px;
      margin: 8px 0;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-xl);
    }
    summary {
      font-weight: var(--ha-font-weight-bold);
      cursor: pointer;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-cloud-support-package": DialogSupportPackage;
  }
}
