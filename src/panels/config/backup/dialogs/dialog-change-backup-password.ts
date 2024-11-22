import { mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-button";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { ChangeBackupPasswordDialogParams } from "./show-dialog-change-backup-password";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-password-field";
import "../../../../components/ha-md-dialog";

const STEPS = ["current", "new", "save"] as const;

@customElement("ha-dialog-change-backup-password")
class DialogChangeBackupPassword extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _step?: "current" | "new" | "save";

  @state() private _params?: ChangeBackupPasswordDialogParams;

  @query("ha-md-dialog") private _dialog!: HaMdDialog;

  private _newPassword?: string;

  public showDialog(params: ChangeBackupPasswordDialogParams): void {
    this._params = params;
    this._step = this._params?.currentPassword ? STEPS[0] : STEPS[1];
    this._opened = true;
  }

  public closeDialog(): void {
    if (this._params!.cancel) {
      this._params!.cancel();
    }
    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    this._step = undefined;
    this._params = undefined;
    this._newPassword = undefined;
  }

  private _closeDialog() {
    this._dialog.close();
  }

  private _previousStep() {
    const index = STEPS.indexOf(this._step!);
    if (index === 0) {
      return;
    }
    this._step = STEPS[index - 1];
  }

  private _nextStep() {
    const index = STEPS.indexOf(this._step!);
    if (index === STEPS.length - 1) {
      return;
    }
    this._step = STEPS[index + 1];
  }

  protected render() {
    if (!this._opened || !this._params) {
      return nothing;
    }

    const dialogTitle =
      this._step === "current"
        ? "Save current encryption key"
        : this._step === "new"
          ? "New encryption key"
          : "Save new encryption key";

    return html`
      <ha-md-dialog open @closed=${this.closeDialog}>
        <ha-dialog-header slot="headline">
          ${this._params?.currentPassword && this._step === "new"
            ? html`
                <ha-icon-button-prev
                  slot="navigationIcon"
                  @click=${this._previousStep}
                ></ha-icon-button-prev>
              `
            : html`
                <ha-icon-button
                  slot="navigationIcon"
                  .label=${this.hass.localize("ui.dialogs.generic.close")}
                  .path=${mdiClose}
                  @click=${this.closeDialog}
                ></ha-icon-button>
              `}
          <span slot="title">${dialogTitle}</span>
        </ha-dialog-header>
        <div slot="content">${this._renderStepContent()}</div>
        <div slot="actions">
          ${this._step !== "current"
            ? html`<ha-button @click=${this._closeDialog}>Cancel</ha-button>`
            : nothing}
          ${this._step === "new"
            ? html`<ha-button @click=${this._submit}
                >Change encryption key</ha-button
              >`
            : this._step === "save"
              ? html`<ha-button @click=${this._closeDialog}>Done</ha-button>`
              : html`<ha-button @click=${this._nextStep}>Next</ha-button>`}
        </div>
      </ha-md-dialog>
    `;
  }

  private _renderStepContent() {
    switch (this._step) {
      case "current":
        return html`Make sure you have saved the current encryption key to make
          sure you have access to all your current backups. All next backups
          will use the new encryption key.

          <ha-password-field
            readOnly
            .value=${this._params?.currentPassword}
          ></ha-password-field>`;
      case "new":
        return html`All next backups will use the new encryption key.

          <ha-password-field
            @input=${this._passwordChanged}
          ></ha-password-field>`;
      case "save":
        return html`It’s important that you don’t lose this encryption key. We
          recommend to save this key somewhere secure. As you can only restore
          your data with the backup encryption key.

          <ha-password-field
            readOnly
            .value=${this._newPassword!}
          ></ha-password-field>`;
    }
    return nothing;
  }

  private _passwordChanged(ev) {
    this._newPassword = ev.target.value;
  }

  private async _submit() {
    if (!this._newPassword) {
      return;
    }
    this._params!.submit?.(this._newPassword);
    this._nextStep();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-md-dialog {
          max-width: 500px;
        }
        div[slot="content"] {
          margin-top: -16px;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-md-dialog {
            max-width: none;
          }
          div[slot="content"] {
            margin-top: 0;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-change-backup-password": DialogChangeBackupPassword;
  }
}
