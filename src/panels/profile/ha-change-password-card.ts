import "@material/mwc-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-card";
import "../../components/ha-circular-progress";
import "../../components/ha-textfield";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../../components/ha-alert";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../dialogs/generic/show-dialog-box";
import { fireEvent } from "../../common/dom/fire_event";
import { RefreshToken } from "../../data/refresh_token";

@customElement("ha-change-password-card")
class HaChangePasswordCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _loading = false;

  @state() private _statusMsg?: string;

  @state() private _errorMsg?: string;

  @state() private _currentPassword = "";

  @state() private _password = "";

  @state() private _passwordConfirm = "";

  @property({ attribute: false }) public refreshTokens?: RefreshToken[];

  protected render(): TemplateResult {
    return html`
      <ha-card
        .header=${this.hass.localize("ui.panel.profile.change_password.header")}
      >
        <div class="card-content">
          ${this._errorMsg
            ? html`<ha-alert alert-type="error">${this._errorMsg}</ha-alert>`
            : ""}
          ${this._statusMsg
            ? html`<ha-alert alert-type="success">${this._statusMsg}</ha-alert>`
            : ""}

          <ha-textfield
            id="currentPassword"
            name="currentPassword"
            .label=${this.hass.localize(
              "ui.panel.profile.change_password.current_password"
            )}
            type="password"
            autocomplete="current-password"
            .value=${this._currentPassword}
            @input=${this._currentPasswordChanged}
            required
          ></ha-textfield>

          ${this._currentPassword
            ? html`<ha-textfield
                  .label=${this.hass.localize(
                    "ui.panel.profile.change_password.new_password"
                  )}
                  name="password"
                  type="password"
                  autocomplete="new-password"
                  .value=${this._password}
                  @change=${this._newPasswordChanged}
                  required
                  auto-validate
                ></ha-textfield>
                <ha-textfield
                  .label=${this.hass.localize(
                    "ui.panel.profile.change_password.confirm_new_password"
                  )}
                  name="passwordConfirm"
                  type="password"
                  autocomplete="new-password"
                  .value=${this._passwordConfirm}
                  @input=${this._newPasswordConfirmChanged}
                  required
                  auto-validate
                ></ha-textfield>`
            : ""}
        </div>

        <div class="card-actions">
          ${this._loading
            ? html`<div>
                <ha-circular-progress active></ha-circular-progress>
              </div>`
            : html`<mwc-button
                @click=${this._changePassword}
                .disabled=${!this._passwordConfirm}
                >${this.hass.localize(
                  "ui.panel.profile.change_password.submit"
                )}</mwc-button
              >`}
        </div>
      </ha-card>
    `;
  }

  private _currentPasswordChanged(ev) {
    this._currentPassword = ev.target.value;
  }

  private _newPasswordChanged(ev) {
    this._password = ev.target.value;
  }

  private _newPasswordConfirmChanged(ev) {
    this._passwordConfirm = ev.target.value;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("keypress", (ev) => {
      this._statusMsg = undefined;
      if (ev.key === "Enter") {
        this._changePassword();
      }
    });
  }

  private async _changePassword() {
    this._statusMsg = undefined;
    if (!this._currentPassword || !this._password || !this._passwordConfirm) {
      return;
    }

    if (this._password !== this._passwordConfirm) {
      this._errorMsg = this.hass.localize(
        "ui.panel.profile.change_password.error_new_mismatch"
      );
      return;
    }

    if (this._currentPassword === this._password) {
      this._errorMsg = this.hass.localize(
        "ui.panel.profile.change_password.error_new_is_old"
      );
      return;
    }

    this._loading = true;
    this._errorMsg = undefined;

    try {
      await this.hass.callWS({
        type: "config/auth_provider/homeassistant/change_password",
        current_password: this._currentPassword,
        new_password: this._password,
      });
    } catch (err: any) {
      this._errorMsg = err.message;
      return;
    } finally {
      this._loading = false;
    }

    this._statusMsg = this.hass.localize(
      "ui.panel.profile.change_password.success"
    );

    if (
      this.refreshTokens &&
      this.refreshTokens.length > 1 &&
      (await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.profile.change_password.logout_all_sessions"
        ),
        text: this.hass.localize(
          "ui.panel.profile.change_password.logout_all_sessions_text"
        ),
        dismissText: this.hass.localize("ui.common.no"),
        confirmText: this.hass.localize("ui.common.yes"),
        destructive: true,
      }))
    ) {
      const promises = this.refreshTokens
        .filter((token) => token.type === "normal" && !token.is_current)
        .map((token) =>
          this.hass.callWS({
            type: "auth/delete_refresh_token",
            refresh_token_id: token.id,
          })
        );
      try {
        await Promise.all(promises);
      } catch (err: any) {
        await showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.profile.change_password.delete_failed"
          ),
          text: err.message,
        });
      } finally {
        fireEvent(this, "hass-refresh-tokens");
      }
    }

    this._currentPassword = "";
    this._password = "";
    this._passwordConfirm = "";
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-textfield {
          margin-top: 8px;
          display: block;
        }
        #currentPassword {
          margin-top: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-change-password-card": HaChangePasswordCard;
  }
}
