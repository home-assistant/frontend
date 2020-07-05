import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-switch";
import "../../../components/ha-formfield";
import {
  SYSTEM_GROUP_ID_ADMIN,
  SYSTEM_GROUP_ID_USER,
} from "../../../data/user";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { UserDetailDialogParams } from "./show-dialog-user-detail";
import { computeRTLDirection } from "../../../common/util/compute_rtl";

@customElement("dialog-user-detail")
class DialogUserDetail extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() private _name!: string;

  @property() private _isAdmin?: boolean;

  @property() private _error?: string;

  @property() private _params?: UserDetailDialogParams;

  @property() private _submitting = false;

  public async showDialog(params: UserDetailDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = params.entry.name || "";
    this._isAdmin = params.entry.group_ids[0] === SYSTEM_GROUP_ID_ADMIN;
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const user = this._params.entry;
    return html`
      <ha-dialog
        open
        @closing=${this._close}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(this.hass, user.name)}
      >
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          <div class="secondary">
            ${this.hass.localize("ui.panel.config.users.editor.id")}: ${user.id}
          </div>
          <div>
            ${user.is_owner
              ? html`
                  <span class="state"
                    >${this.hass.localize(
                      "ui.panel.config.users.editor.owner"
                    )}</span
                  >
                `
              : ""}
            ${user.system_generated
              ? html`
                  <span class="state">
                    ${this.hass.localize(
                      "ui.panel.config.users.editor.system_generated"
                    )}
                  </span>
                `
              : ""}
            ${user.is_active
              ? html`
                  <span class="state"
                    >${this.hass.localize(
                      "ui.panel.config.users.editor.active"
                    )}</span
                  >
                `
              : ""}
          </div>
          <div class="form">
            <paper-input
              .value=${this._name}
              .disabled=${user.system_generated}
              @value-changed=${this._nameChanged}
              label="${this.hass!.localize(
                "ui.panel.config.users.editor.name"
              )}"
            ></paper-input>
            <ha-formfield
              .label=${this.hass.localize("ui.panel.config.users.editor.admin")}
              .dir="${computeRTLDirection(this.hass)}"
            >
              <ha-switch
                .disabled=${user.system_generated}
                .checked=${this._isAdmin}
                @change=${this._adminChanged}
              >
              </ha-switch>
            </ha-formfield>
            ${!this._isAdmin
              ? html`
                  <br />
                  ${this.hass.localize(
                    "ui.panel.config.users.users_privileges_note"
                  )}
                `
              : ""}
          </div>
        </div>

        <div slot="secondaryAction">
          <mwc-button
            class="warning"
            @click=${this._deleteEntry}
            .disabled=${this._submitting || user.system_generated}
          >
            ${this.hass!.localize("ui.panel.config.users.editor.delete_user")}
          </mwc-button>
          ${user.system_generated
            ? html`
                <paper-tooltip position="right">
                  ${this.hass.localize(
                    "ui.panel.config.users.editor.system_generated_users_not_removable"
                  )}
                </paper-tooltip>
              `
            : ""}
        </div>
        <div slot="primaryAction">
          <mwc-button
            @click=${this._updateEntry}
            .disabled=${!this._name ||
            this._submitting ||
            user.system_generated}
          >
            ${this.hass!.localize("ui.panel.config.users.editor.update_user")}
          </mwc-button>
          ${user.system_generated
            ? html`
                <paper-tooltip position="left">
                  ${this.hass.localize(
                    "ui.panel.config.users.editor.system_generated_users_not_editable"
                  )}
                </paper-tooltip>
              `
            : ""}
        </div>
      </ha-dialog>
    `;
  }

  private _nameChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._name = ev.detail.value;
  }

  private async _adminChanged(ev): Promise<void> {
    this._isAdmin = ev.target.checked;
  }

  private async _updateEntry() {
    this._submitting = true;
    try {
      await this._params!.updateEntry({
        name: this._name.trim(),
        group_ids: [
          this._isAdmin ? SYSTEM_GROUP_ID_ADMIN : SYSTEM_GROUP_ID_USER,
        ],
      });
      this._close();
    } catch (err) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteEntry() {
    this._submitting = true;
    try {
      if (await this._params!.removeEntry()) {
        this._params = undefined;
      }
    } finally {
      this._submitting = false;
    }
  }

  private _close(): void {
    this._params = undefined;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 500px;
        }
        .form {
          padding-top: 16px;
        }
        .secondary {
          color: var(--secondary-text-color);
        }
        .state {
          background-color: rgba(var(--rgb-primary-text-color), 0.15);
          border-radius: 16px;
          padding: 4px 8px;
          margin-top: 8px;
          display: inline-block;
        }
        .state:not(:first-child) {
          margin-left: 8px;
        }
        ha-switch {
          margin-top: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-user-detail": DialogUserDetail;
  }
}
