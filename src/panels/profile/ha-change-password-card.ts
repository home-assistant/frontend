import "@material/mwc-button";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-input/paper-input";
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
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";

@customElement("ha-change-password-card")
class HaChangePasswordCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _loading = false;

  @state() private _statusMsg?: string;

  @state() private _errorMsg?: string;

  @state() private _currentPassword?: string;

  @state() private _password?: string;

  @state() private _passwordConfirm?: string;

  protected render(): TemplateResult {
    return html`
      <div>
        <ha-card
          .header=${this.hass.localize(
            "ui.panel.profile.change_password.header"
          )}
        >
          <div class="card-content">
            ${this._errorMsg
              ? html` <div class="error">${this._errorMsg}</div> `
              : ""}
            ${this._statusMsg
              ? html` <div class="status">${this._statusMsg}</div> `
              : ""}

            <paper-input
              id="currentPassword"
              .label=${this.hass.localize(
                "ui.panel.profile.change_password.current_password"
              )}
              type="password"
              .value=${this._currentPassword}
              @value-changed=${this._currentPasswordChanged}
              required
            ></paper-input>

            ${this._currentPassword
              ? html` <paper-input
                    .label=${this.hass.localize(
                      "ui.panel.profile.change_password.new_password"
                    )}
                    name="password"
                    type="password"
                    .value=${this._password}
                    @value-changed=${this._newPasswordChanged}
                    required
                    auto-validate
                  ></paper-input>
                  <paper-input
                    .label=${this.hass.localize(
                      "ui.panel.profile.change_password.confirm_new_password"
                    )}
                    name="passwordConfirm"
                    type="password"
                    .value=${this._passwordConfirm}
                    @value-changed=${this._newPasswordConfirmChanged}
                    required
                    auto-validate
                  ></paper-input>`
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
      </div>
    `;
  }

  private _currentPasswordChanged(ev: CustomEvent) {
    this._currentPassword = ev.detail.value;
  }

  private _newPasswordChanged(ev: CustomEvent) {
    this._password = ev.detail.value;
  }

  private _newPasswordConfirmChanged(ev: CustomEvent) {
    this._passwordConfirm = ev.detail.value;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("keypress", (ev) => {
      this._statusMsg = undefined;
      if (ev.keyCode === 13) {
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
    this._currentPassword = undefined;
    this._password = undefined;
    this._passwordConfirm = undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .error {
          color: var(--error-color);
        }
        .status {
          color: var(--primary-color);
        }
        #currentPassword {
          margin-top: -8px;
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
