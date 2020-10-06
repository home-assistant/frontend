import { mdiClose } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-header-bar";
import { HassDialog } from "../../../../src/dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/hassio-upload-snapshot";
import { HassioSnapshotUploadDialogParams } from "./show-dialog-snapshot-upload";

@customElement("dialog-hassio-snapshot-upload")
export class DialogHassioSnapshotUpload extends LitElement
  implements HassDialog<HassioSnapshotUploadDialogParams> {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _params?: HassioSnapshotUploadDialogParams;

  public async showDialog(
    params: HassioSnapshotUploadDialogParams
  ): Promise<void> {
    this._params = params;
    await this.updateComplete;
  }

  public closeDialog(): void {
    if (this._params && !this._params.onboarding) {
      if (this._params.reloadSnapshot) {
        this._params.reloadSnapshot();
      }
    }
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        hideActions
        .heading=${true}
        @closed=${this.closeDialog}
      >
        <div slot="heading">
          <ha-header-bar>
            <span slot="title">
              Upload snapshot
            </span>
            <mwc-icon-button slot="actionItems" dialogAction="cancel">
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </mwc-icon-button>
          </ha-header-bar>
        </div>
        <hassio-upload-snapshot
          @snapshot-uploaded=${this._snapshotUploaded}
          .hass=${this.hass}
        ></hassio-upload-snapshot>
      </ha-dialog>
    `;
  }

  private _snapshotUploaded(ev) {
    const snapshot = ev.detail.snapshot;
    this._params?.showSnapshot(snapshot.slug);
    this.closeDialog();
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
        }
        /* overrule the ha-style-dialog max-height on small screens */
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-header-bar {
            --mdc-theme-primary: var(--app-header-background-color);
            --mdc-theme-on-primary: var(--app-header-text-color, white);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-snapshot-upload": DialogHassioSnapshotUpload;
  }
}
