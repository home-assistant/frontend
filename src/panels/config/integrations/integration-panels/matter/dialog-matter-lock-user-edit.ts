import { mdiDelete, mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-button";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-list";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-select";
import "../../../../../components/ha-textfield";
import type {
  MatterLockUserType,
  MatterLockUserStatus,
  MatterLockCredentialRule,
  MatterLockCredentialRef,
} from "../../../../../data/matter-lock";
import {
  setMatterLockUser,
  clearMatterLockCredential,
} from "../../../../../data/matter-lock";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { MatterLockUserEditDialogParams } from "./show-dialog-matter-lock-user-edit";
import { showMatterLockCredentialEditDialog } from "./show-dialog-matter-lock-credential-edit";

const USER_TYPES: MatterLockUserType[] = [
  "unrestricted",
  "year_day",
  "week_day",
  "programming",
  "non_access",
  "forced",
  "disposable",
  "expiring",
];

const USER_STATUSES: MatterLockUserStatus[] = [
  "occupied_enabled",
  "occupied_disabled",
];

const CREDENTIAL_RULES: MatterLockCredentialRule[] = ["single", "dual", "tri"];

@customElement("dialog-matter-lock-user-edit")
class DialogMatterLockUserEdit extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: MatterLockUserEditDialogParams;

  @state() private _userName = "";

  @state() private _userStatus: MatterLockUserStatus = "occupied_enabled";

  @state() private _userType: MatterLockUserType = "unrestricted";

  @state() private _credentialRule: MatterLockCredentialRule = "single";

  @state() private _credentials: MatterLockCredentialRef[] = [];

  @state() private _saving = false;

  public async showDialog(
    params: MatterLockUserEditDialogParams
  ): Promise<void> {
    this._params = params;

    if (params.user) {
      this._userName = params.user.user_name || "";
      this._userStatus =
        params.user.user_status === "available"
          ? "occupied_enabled"
          : params.user.user_status;
      this._userType = params.user.user_type;
      this._credentialRule = params.user.credential_rule;
      this._credentials = [...params.user.credentials];
    } else {
      this._userName = "";
      this._userStatus = "occupied_enabled";
      this._userType = "unrestricted";
      this._credentialRule = "single";
      this._credentials = [];
    }
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const isNew = !this._params.user;
    const title = isNew
      ? this.hass.localize("ui.panel.config.matter.lock.users.add")
      : this.hass.localize("ui.panel.config.matter.lock.users.edit");

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(this.hass, title)}
      >
        <div class="form">
          <ha-textfield
            .label=${this.hass.localize(
              "ui.panel.config.matter.lock.users.name"
            )}
            .value=${this._userName}
            @input=${this._handleNameChange}
            maxlength="10"
          ></ha-textfield>

          <ha-select
            .label=${this.hass.localize(
              "ui.panel.config.matter.lock.users.status"
            )}
            .value=${this._userStatus}
            @selected=${this._handleStatusChange}
          >
            ${USER_STATUSES.map(
              (status) => html`
                <ha-list-item .value=${status}>
                  ${this.hass.localize(
                    `ui.panel.config.matter.lock.users.user_status.${status}`
                  )}
                </ha-list-item>
              `
            )}
          </ha-select>

          <ha-select
            .label=${this.hass.localize(
              "ui.panel.config.matter.lock.users.type"
            )}
            .value=${this._userType}
            @selected=${this._handleTypeChange}
          >
            ${USER_TYPES.map(
              (type) => html`
                <ha-list-item .value=${type}>
                  ${this.hass.localize(
                    `ui.panel.config.matter.lock.users.user_type.${type}`
                  )}
                </ha-list-item>
              `
            )}
          </ha-select>

          <ha-select
            .label=${this.hass.localize(
              "ui.panel.config.matter.lock.users.credential_rule"
            )}
            .value=${this._credentialRule}
            @selected=${this._handleCredentialRuleChange}
          >
            ${CREDENTIAL_RULES.map(
              (rule) => html`
                <ha-list-item .value=${rule}>
                  ${this.hass.localize(
                    `ui.panel.config.matter.lock.users.credential_rules.${rule}`
                  )}
                </ha-list-item>
              `
            )}
          </ha-select>

          ${!isNew
            ? html`
                <div class="credentials-section">
                  <h4>
                    ${this.hass.localize(
                      "ui.panel.config.matter.lock.users.credentials"
                    )}
                  </h4>
                  ${this._credentials.length === 0
                    ? html`<p class="empty">
                        ${this.hass.localize(
                          "ui.panel.config.matter.lock.users.no_users"
                        )}
                      </p>`
                    : html`
                        <ha-list>
                          ${this._credentials.map(
                            (cred) => html`
                              <ha-list-item hasMeta>
                                ${this.hass.localize(
                                  `ui.panel.config.matter.lock.credentials.types.${cred.credential_type}`
                                )}
                                #${cred.credential_index}
                                <ha-icon-button
                                  slot="meta"
                                  .path=${mdiDelete}
                                  .credential=${cred}
                                  @click=${this._handleDeleteCredentialClick}
                                ></ha-icon-button>
                              </ha-list-item>
                            `
                          )}
                        </ha-list>
                      `}
                  <ha-button @click=${this._addCredential}>
                    <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.config.matter.lock.credentials.add"
                    )}
                  </ha-button>
                </div>
              `
            : nothing}
        </div>

        <ha-button
          slot="primaryAction"
          @click=${this._save}
          .disabled=${this._saving}
        >
          ${this.hass.localize("ui.common.save")}
        </ha-button>
        <ha-button slot="secondaryAction" @click=${this.closeDialog}>
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _handleNameChange(ev: InputEvent): void {
    this._userName = (ev.target as HTMLInputElement).value;
  }

  private _handleStatusChange(ev: CustomEvent): void {
    this._userStatus = ev.detail.value as MatterLockUserStatus;
  }

  private _handleTypeChange(ev: CustomEvent): void {
    this._userType = ev.detail.value as MatterLockUserType;
  }

  private _handleCredentialRuleChange(ev: CustomEvent): void {
    this._credentialRule = ev.detail.value as MatterLockCredentialRule;
  }

  private async _addCredential(): Promise<void> {
    showMatterLockCredentialEditDialog(this, {
      device_id: this._params!.device_id,
      lockInfo: this._params!.lockInfo,
      userIndex: this._params!.user!.user_index,
      onSaved: () => {
        this._params!.onSaved();
        this.closeDialog();
      },
    });
  }

  private _handleDeleteCredentialClick(ev: Event): void {
    const cred = (ev.currentTarget as any)
      .credential as MatterLockCredentialRef;
    this._deleteCredential(cred);
  }

  private async _deleteCredential(
    cred: MatterLockCredentialRef
  ): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.matter.lock.credentials.delete"
      ),
      text: this.hass.localize(
        "ui.panel.config.matter.lock.confirm_delete_credential"
      ),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await clearMatterLockCredential(
        this.hass,
        this._params!.device_id,
        this._params!.user!.user_index,
        cred.credential_type,
        cred.credential_index
      );
      this._credentials = this._credentials.filter(
        (c) =>
          c.credential_type !== cred.credential_type ||
          c.credential_index !== cred.credential_index
      );
    } catch (err: unknown) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.matter.lock.errors.save_failed"
        ),
        text: (err as Error).message,
      });
    }
  }

  private async _save(): Promise<void> {
    if (!this._params) {
      return;
    }

    this._saving = true;

    try {
      await setMatterLockUser(this.hass, this._params.device_id, {
        user_index: this._params.user?.user_index ?? null,
        user_name: this._userName || null,
        user_status: this._userStatus,
        user_type: this._userType,
        credential_rule: this._credentialRule,
      });

      this._params.onSaved();
      this.closeDialog();
    } catch (err: unknown) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.matter.lock.errors.save_failed"
        ),
        text: (err as Error).message,
      });
    } finally {
      this._saving = false;
    }
  }

  public closeDialog(): void {
    this._params = undefined;
    this._userName = "";
    this._userStatus = "occupied_enabled";
    this._userType = "unrestricted";
    this._credentialRule = "single";
    this._credentials = [];
    this._saving = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px 24px;
        }
        .credentials-section {
          margin-top: 16px;
        }
        .credentials-section h4 {
          margin: 0 0 8px 0;
        }
        .empty {
          color: var(--secondary-text-color);
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-lock-user-edit": DialogMatterLockUserEdit;
  }
}
