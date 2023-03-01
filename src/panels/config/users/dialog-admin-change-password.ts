import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";

import { fireEvent } from "../../../common/dom/fire_event";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-form/ha-form";
import { SchemaUnion } from "../../../components/ha-form/types";
import "../../../components/ha-textfield";
import { adminChangePassword } from "../../../data/auth";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";
import { AdminChangePasswordDialogParams } from "./show-dialog-admin-change-password";

const SCHEMA = [
  {
    name: "new_password",
    required: true,
    selector: {
      text: {
        type: "password",
        autocomplete: "new-password",
      },
    },
  },
  {
    name: "password_confirm",
    required: true,
    selector: {
      text: {
        type: "password",
        autocomplete: "new-password",
      },
    },
  },
] as const;

type FormData = { new_password?: string; password_confirm?: string };

@customElement("dialog-admin-change-password")
class DialogAdminChangePassword extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: AdminChangePasswordDialogParams;

  @state() private _userId?: string;

  @state() private _data?: FormData;

  @state() private _error?: Record<string, string>;

  @state() private _submitting = false;

  @state() private _success = false;

  public showDialog(params: AdminChangePasswordDialogParams): void {
    this._params = params;
    this._userId = params.userId;
  }

  public closeDialog(): void {
    this._params = undefined;
    this._data = undefined;
    this._submitting = false;
    this._success = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _computeLabel = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass.localize(`ui.panel.config.users.change_password.${schema.name}`);

  private _computeError = (error: string) =>
    this.hass.localize(
      `ui.panel.config.users.change_password.${error}` as any
    ) || error;

  private _validate() {
    if (
      this._data &&
      this._data.new_password &&
      this._data.password_confirm &&
      this._data.new_password !== this._data.password_confirm
    ) {
      this._error = {
        password_confirm: "password_no_match",
      };
    } else {
      this._error = undefined;
    }
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const canSubmit = Boolean(
      this._data?.new_password && this._data?.password_confirm && !this._error
    );

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.users.change_password.caption")
        )}
      >
        ${this._success
          ? html`
              <p>
                ${this.hass.localize(
                  "ui.panel.config.users.change_password.password_changed"
                )}
              </p>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.dialogs.generic.ok")}
              </mwc-button>
            `
          : html`
              <ha-form
                .hass=${this.hass}
                .data=${this._data}
                .error=${this._error}
                .schema=${SCHEMA}
                .computeLabel=${this._computeLabel}
                .computeError=${this._computeError}
                @value-changed=${this._valueChanged}
                .disabled=${this._submitting}
              ></ha-form>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.cancel")}
              </mwc-button>
              <mwc-button
                slot="primaryAction"
                @click=${this._changePassword}
                .disabled=${this._submitting || !canSubmit}
              >
                ${this.hass.localize(
                  "ui.panel.config.users.change_password.change"
                )}
              </mwc-button>
            `}
      </ha-dialog>
    `;
  }

  private _valueChanged(ev) {
    this._data = ev.detail.value;
    this._validate();
  }

  private async _changePassword(): Promise<void> {
    if (!this._userId || !this._data?.new_password) return;
    try {
      this._submitting = true;
      await adminChangePassword(
        this.hass,
        this._userId!,
        this._data.new_password
      );
      this._success = true;
    } catch (err: any) {
      showToast(this, {
        message: err.body?.message || err.message || err,
      });
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [haStyleDialog, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-admin-change-password": DialogAdminChangePassword;
  }
}
