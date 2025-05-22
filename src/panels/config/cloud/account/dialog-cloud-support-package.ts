import "@material/mwc-button";

import { mdiClose } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-spinner";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-markdown-element";
import "../../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import "../../../../components/ha-select";
import "../../../../components/ha-textarea";
import { fetchSupportPackage } from "../../../../data/cloud";
import type { HomeAssistant } from "../../../../types";
import { fileDownload } from "../../../../util/file_download";

@customElement("dialog-cloud-support-package")
export class DialogSupportPackage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _supportPackage?: string;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

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
    this._dialog?.close();
    return true;
  }

  protected render() {
    if (!this._open) {
      return nothing;
    }
    return html`
      <ha-md-dialog open @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span slot="title">Download support package</span>
        </ha-dialog-header>

        <div slot="content">
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
        </div>
        <div class="footer" slot="actions">
          <ha-alert>
            This file may contain personal data about your home. Avoid sharing
            them with unverified or untrusted parties.
          </ha-alert>
          <hr />
          <div class="actions">
            <ha-button @click=${this.closeDialog}>Close</ha-button>
            <ha-button @click=${this._download}>Download</ha-button>
          </div>
        </div>
      </ha-md-dialog>
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
    ha-md-dialog {
      min-width: 90vw;
      min-height: 90vh;
    }

    .progress-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: calc(90vh - 260px);
      width: 100%;
    }

    @media all and (max-width: 450px), all and (max-height: 500px) {
      ha-md-dialog {
        min-width: 100vw;
        min-height: 100vh;
      }
      .progress-container {
        height: calc(100vh - 260px);
      }
    }

    .footer {
      flex-direction: column;
    }
    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    hr {
      border: none;
      border-top: 1px solid var(--divider-color);
      width: calc(100% + 48px);
      margin-right: -24px;
      margin-left: -24px;
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
      border-radius: 0;
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
      border-radius: 2px;
    }
    details {
      background-color: var(--secondary-background-color);
      padding: 16px 24px;
      margin: 8px 0;
      border: 1px solid var(--divider-color);
      border-radius: 16px;
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
