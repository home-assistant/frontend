import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { mdiKey, mdiDotsVertical, mdiDelete, mdiRename } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import { ActionDetail } from "@material/mwc-list";
import { relativeTime } from "../../common/datetime/relative_time";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-card";
import "../../components/ha-circular-progress";
import "../../components/ha-textfield";
import {
  Passkey,
  PublicKeyCredentialCreationOptions,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyRegistartionCredentialResponse,
  PublicKeyRegistartionCredentialResponseJSON,
} from "../../data/webauthn";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../../components/ha-alert";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../dialogs/generic/show-dialog-box";

@customElement("ha-setup-passkey-card")
class HaSetupPasskeyCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public passkeys!: Passkey[];

  protected render(): TemplateResult {
    return html`
      <ha-card
        .header=${this.hass.localize("ui.panel.profile.passkeys.header")}
      >
        <div class="card-content">
          ${this.hass.localize("ui.panel.profile.passkeys.description")}
          ${!this.passkeys?.length
            ? html`<p>
                ${this.hass.localize("ui.panel.profile.passkeys.empty_state")}
              </p>`
            : this.passkeys.map(
                (passkey) => html`
                  <ha-settings-row two-line>
                    <ha-svg-icon slot="prefix" .path=${mdiKey}></ha-svg-icon>
                    <span slot="heading">${passkey.name}</span>
                    <div slot="description">
                      ${this.hass.localize(
                        "ui.panel.profile.passkeys.created_at",
                        {
                          date: relativeTime(
                            new Date(passkey.created_at),
                            this.hass.locale
                          ),
                        }
                      )}
                    </div>
                    <div slot="description">
                      ${passkey.last_used_at
                        ? this.hass.localize(
                            "ui.panel.profile.passkeys.last_used",
                            {
                              date: relativeTime(
                                new Date(passkey.last_used_at),
                                this.hass.locale
                              ),
                            }
                          )
                        : this.hass.localize(
                            "ui.panel.profile.passkeys.not_used"
                          )}
                    </div>
                    <div>
                      <ha-button-menu
                        corner="BOTTOM_END"
                        menuCorner="END"
                        @action=${this._handleAction}
                        .passkey=${passkey}
                      >
                        <ha-icon-button
                          slot="trigger"
                          .path=${mdiDotsVertical}
                        ></ha-icon-button>
                        <ha-list-item graphic="icon">
                          <ha-svg-icon
                            .path=${mdiRename}
                            slot="graphic"
                          ></ha-svg-icon>
                          ${this.hass.localize("ui.common.rename")}
                        </ha-list-item>
                        <ha-list-item graphic="icon">
                          <ha-svg-icon
                            .path=${mdiDelete}
                            slot="graphic"
                          ></ha-svg-icon>
                          ${this.hass.localize("ui.common.delete")}
                        </ha-list-item>
                      </ha-button-menu>
                    </div>
                  </ha-settings-row>
                `
              )}
        </div>

        <div class="card-actions">
          <mwc-button @click=${this._registerPasskey}
            >${this.hass.localize("ui.common.add")}</mwc-button
          >
        </div>
      </ha-card>
    `;
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    const passkey = (ev.currentTarget as any).passkey;
    switch (ev.detail.index) {
      case 0:
        this._renamePasskey(passkey);
        break;
      case 1:
        this._deletePasskey(passkey);
        break;
    }
  }

  private async _renamePasskey(passkey: Passkey): Promise<void> {
    const newName = await showPromptDialog(this, {
      text: this.hass.localize("ui.panel.profile.passkeys.prompt_name"),
      inputLabel: this.hass.localize("ui.panel.profile.passkeys.name"),
    });
    if (!newName || newName === passkey.name) {
      return;
    }
    try {
      await this.hass.callWS({
        type: "config/auth_provider/passkey/rename",
        credential_id: passkey.credential_id,
        name: newName,
      });
      fireEvent(this, "hass-refresh-passkeys");
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.profile.passkeys.rename_failed"),
        text: err.message,
      });
    }
  }

  private async _deletePasskey(passkey: Passkey): Promise<void> {
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.profile.passkeys.confirm_delete_title"
        ),
        text: this.hass.localize(
          "ui.panel.profile.passkeys.confirm_delete_text",
          { name: passkey.name }
        ),
        confirmText: this.hass.localize("ui.common.delete"),
        destructive: true,
      }))
    ) {
      return;
    }
    try {
      await this.hass.callWS({
        type: "config/auth_provider/passkey/delete",
        credential_id: passkey.credential_id,
      });
      fireEvent(this, "hass-refresh-passkeys");
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.profile.passkeys.delete_failed"),
        text: err.message,
      });
    }
  }

  private async _registerPasskey() {
    try {
      const registrationOptions: PublicKeyCredentialCreationOptionsJSON =
        await this.hass.callWS({
          type: "config/auth_provider/passkey/register",
        });
      const options: PublicKeyCredentialCreationOptions = {
        ...registrationOptions,
        user: {
          ...registrationOptions.user,
          id: this._base64url.decode(registrationOptions.user.id),
        },
        challenge: this._base64url.decode(registrationOptions.challenge),
        excludeCredentials: registrationOptions.excludeCredentials.map(
          (cred) => ({
            ...cred,
            id: this._base64url.decode(cred.id),
          })
        ),
      };

      const result = await navigator.credentials.create({ publicKey: options });
      const publicKeyCredential =
        result as PublicKeyRegistartionCredentialResponse;
      const credentials: PublicKeyRegistartionCredentialResponseJSON = {
        id: publicKeyCredential.id,
        authenticatorAttachment: publicKeyCredential.authenticatorAttachment,
        type: publicKeyCredential.type,
        rawId: this._base64url.encode(publicKeyCredential.rawId),
        response: {
          clientDataJSON: this._base64url.encode(
            publicKeyCredential.response.clientDataJSON
          ),
          attestationObject: this._base64url.encode(
            publicKeyCredential.response.attestationObject
          ),
        },
      };
      this._verifyRegistrationPasskey(credentials);
    } catch (error: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.profile.passkeys.register_failed"),
        text: error.message,
      });
    }
  }

  private async _verifyRegistrationPasskey(
    credential: PublicKeyRegistartionCredentialResponseJSON
  ) {
    try {
      this.hass
        .callWS({
          type: "config/auth_provider/passkey/register_verify",
          credential: credential,
        })
        .then(() => {
          fireEvent(this, "hass-refresh-passkeys");
        });
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.profile.passkeys.register_failed"),
        text: err.message,
      });
    }
  }

  private _base64url = {
    encode: function (buffer) {
      const base64 = window.btoa(
        String.fromCharCode(...new Uint8Array(buffer))
      );
      return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    },
    decode: function (base64url) {
      const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
      const binStr = window.atob(base64);
      const bin = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        bin[i] = binStr.charCodeAt(i);
      }
      return bin.buffer;
    },
  };

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-settings-row {
          padding: 0;
          --settings-row-prefix-display: contents;
          --settings-row-content-display: contents;
        }
        ha-icon-button {
          color: var(--primary-text-color);
        }
        ha-list-item[disabled],
        ha-list-item[disabled] ha-svg-icon {
          color: var(--disabled-text-color) !important;
        }
        ha-settings-row .current-session {
          display: inline-flex;
          align-items: center;
        }
        ha-settings-row .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background-color: var(--success-color);
          border-radius: 50%;
          margin-right: 6px;
        }
        ha-settings-row > ha-svg-icon {
          margin-right: 12px;
          margin-inline-start: initial;
          margin-inline-end: 12px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-setup-passkey-card": HaSetupPasskeyCard;
  }
}
