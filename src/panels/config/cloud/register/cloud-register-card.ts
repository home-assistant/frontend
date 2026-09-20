import { mdiEmailCheckOutline } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/buttons/ha-progress-button";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-spinner";
import "../../../../components/ha-svg-icon";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import type { CloudAutoLogin } from "../../../../data/cloud";
import {
  attemptCloudAutoLoginNow,
  cloudRegisterAutoLogin,
  resendCloudAutoLoginConfirm,
} from "../../../../data/cloud";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import { cloudSignedOutStyle } from "../cloud-signed-out-style";

// Registration with email-confirmation auto login. Owns the whole flow so the
// cloud panel page and the voice satellite wizard can present it in their own
// chrome; hosts supply the pending registration, cancel it on the backend when
// asked to, and route the way out.
@customElement("cloud-register-card")
export class CloudRegisterCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public email?: string;

  @property({ attribute: false }) public autoLogin: CloudAutoLogin | null =
    null;

  @property({ type: Boolean, attribute: "card-less" }) public cardLess = false;

  @state() private _requestInProgress = false;

  @state() private _resendInProgress = false;

  @state() private _attemptInProgress = false;

  @state() private _autoLoginError?: string;

  @state() private _error?: string;

  @state() private _success?: string;

  @state() private _registeredEmail = "";

  @state() private _override?: "form" | "confirm";

  private _failedKey: string | null = null;

  private _confirmingReported?: boolean;

  @query("#email") private _emailField?: HaInput;

  @query("#password") private _passwordField?: HaInput;

  @query("#confirm-title") private _confirmTitle?: HTMLElement;

  private get _confirming(): boolean {
    return this._override
      ? this._override === "confirm"
      : this.autoLogin !== null;
  }

  private get _pendingEmail(): string {
    return this._registeredEmail || this.autoLogin?.email || "";
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!changedProps.has("autoLogin")) {
      return;
    }

    if (this._override === (this.autoLogin ? "confirm" : "form")) {
      // The status caught up with the local action, so stop overriding it.
      this._override = undefined;
    }

    const failedKey = this.autoLogin?.failed ?? null;
    if (failedKey !== this._failedKey) {
      this._failedKey = failedKey;
      this._resolveAutoLoginError(failedKey);
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    const confirming = this._confirming;
    if (confirming !== this._confirmingReported) {
      this._confirmingReported = confirming;
      fireEvent(this, "cloud-register-view-changed", { confirming });
    }
  }

  protected render(): TemplateResult {
    return this._confirming ? this._renderConfirm() : this._renderForm();
  }

  private _renderForm(): TemplateResult {
    const title = this.hass.localize(
      "ui.panel.config.cloud.register.create_account"
    );
    const content = html`
      <div class="card-header-block">
        ${this.cardLess ? html`<h1>${title}</h1>` : html`<h2>${title}</h2>`}
        <p>
          ${this.hass.localize("ui.panel.config.cloud.register.information")}
        </p>
      </div>
      <div class="card-content register-form">
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        <ha-input
          autofocus
          id="email"
          name="email"
          .label=${this.hass.localize(
            "ui.panel.config.cloud.register.email_address"
          )}
          type="email"
          autocomplete="email"
          required
          .value=${this.email ?? ""}
          .disabled=${this._requestInProgress}
          @keydown=${this._keyDown}
          .validationMessage=${this.hass.localize(
            "ui.panel.config.cloud.register.email_error_msg"
          )}
        ></ha-input>
        <ha-input
          id="password"
          type="password"
          password-toggle
          name="password"
          .label=${this.hass.localize(
            "ui.panel.config.cloud.register.password"
          )}
          autocomplete="new-password"
          minlength="8"
          required
          .disabled=${this._requestInProgress}
          @keydown=${this._keyDown}
          .validationMessage=${this.hass.localize(
            "ui.panel.config.cloud.register.password_error_msg"
          )}
        ></ha-input>
        <p class="terms">
          ${this.hass.localize("ui.panel.config.cloud.register.terms_notice", {
            terms: html`<a
              href="https://www.nabucasa.com/tos/"
              target="_blank"
              rel="noreferrer"
              >${this.hass.localize(
                "ui.panel.config.cloud.register.link_terms_conditions"
              )}</a
            >`,
            privacy_policy: html`<a
              href="https://www.nabucasa.com/privacy_policy/"
              target="_blank"
              rel="noreferrer"
              >${this.hass.localize(
                "ui.panel.config.cloud.register.link_privacy_policy"
              )}</a
            >`,
          })}
        </p>
      </div>
      <div class="card-actions split">
        <ha-button
          appearance="plain"
          .disabled=${this._requestInProgress}
          @click=${this._handleSignInInstead}
        >
          ${this.hass.localize("ui.panel.config.cloud.register.sign_in_instead")}
        </ha-button>
        <ha-progress-button
          @click=${this._handleRegister}
          .progress=${this._requestInProgress}
          >${this.hass.localize(
            "ui.panel.config.cloud.register.start_trial"
          )}</ha-progress-button
        >
      </div>
    `;

    return this.cardLess
      ? content
      : html`<ha-card outlined>${content}</ha-card>`;
  }

  private _renderConfirm(): TemplateResult {
    const title = this.hass.localize(
      "ui.panel.config.cloud.register.check_your_email"
    );
    const content = html`
      <div class="card-content confirm">
        ${
          this._autoLoginError
            ? html`<ha-alert alert-type="error">
                ${this._autoLoginError}
              </ha-alert>`
            : nothing
        }
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        ${
          this._success
            ? html`<ha-alert alert-type="success">${this._success}</ha-alert>`
            : nothing
        }
        <div class="confirm-icon">
          <ha-svg-icon .path=${mdiEmailCheckOutline}></ha-svg-icon>
        </div>
        ${
          this.cardLess
            ? html`<h1 id="confirm-title" tabindex="-1">${title}</h1>`
            : html`<h2 id="confirm-title" tabindex="-1">${title}</h2>`
        }
        <p>
          ${this.hass.localize(
            "ui.panel.config.cloud.register.confirm_email_body",
            {
              email: html`<span class="email">${this._pendingEmail}</span>`,
            }
          )}
        </p>
        ${
          this._autoLoginError
            ? nothing
            : html`
                <div class="waiting">
                  <ha-spinner size="tiny"></ha-spinner>
                  <span>
                    ${this.hass.localize(
                      "ui.panel.config.cloud.register.waiting_for_confirmation"
                    )}
                  </span>
                </div>
              `
        }
      </div>
      <div class="card-actions split confirm-actions">
        <ha-button appearance="plain" @click=${this._handleCancelPending}>
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        ${
          this._autoLoginError
            ? html`<ha-button
                appearance="accent"
                @click=${this._handleSignInInstead}
              >
                ${this.hass.localize("ui.panel.config.cloud.login.sign_in")}
              </ha-button>`
            : html`<ha-progress-button
                @click=${this._handleAttemptNow}
                .progress=${this._attemptInProgress}
              >
                ${this.hass.localize(
                  "ui.panel.config.cloud.register.clicked_confirm"
                )}
              </ha-progress-button>`
        }
      </div>
    `;

    return html`
      ${this.cardLess ? content : html`<ha-card outlined>${content}</ha-card>`}
      ${
        this._autoLoginError
          ? nothing
          : html`
              <p class="footnote">
                ${this.hass.localize(
                  "ui.panel.config.cloud.register.nothing_arrived",
                  {
                    resend_link: html`<button
                      class="link"
                      .disabled=${this._resendInProgress}
                      @click=${this._handleResendVerifyEmail}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.cloud.register.resend_link"
                      )}
                    </button>`,
                  }
                )}
              </p>
            `
      }
    `;
  }

  private _keyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      this._handleRegister();
    }
  }

  private _handleSignInInstead() {
    const confirming = this._confirming;
    const fieldValue = this._emailField?.value;
    fireEvent(this, "cloud-email-changed", {
      value:
        fieldValue !== undefined
          ? fieldValue
          : this._pendingEmail || this.email || "",
    });
    if (confirming) {
      this._dismiss();
      fireEvent(this, "cloud-cancel-auto-login");
    }
    fireEvent(this, "cloud-sign-in-instead");
  }

  private _handleCancelPending() {
    this._dismiss();
    fireEvent(this, "cloud-cancel-auto-login");
  }

  private _dismiss() {
    this._override = "form";
    this._registeredEmail = "";
    this._error = undefined;
    this._success = undefined;
    this._clearAutoLoginFailure();
  }

  private _clearAutoLoginFailure() {
    this._failedKey = null;
    this._autoLoginError = undefined;
  }

  private async _handleRegister() {
    const emailField = this._emailField;
    const passwordField = this._passwordField;

    if (!emailField || !passwordField) {
      return;
    }

    if (!emailField.reportValidity()) {
      passwordField.reportValidity();
      emailField.focus();
      return;
    }

    if (!passwordField.reportValidity()) {
      passwordField.focus();
      return;
    }

    const email = emailField.value?.toLowerCase() || "";
    const password = passwordField.value || "";

    this._requestInProgress = true;
    this._error = undefined;

    try {
      await cloudRegisterAutoLogin(this.hass, email, password);
    } catch (err: any) {
      this._requestInProgress = false;
      passwordField.value = "";
      this._error =
        err?.body?.message || this.hass.localize("ui.common.unknown_error");
      return;
    }

    this._registeredEmail = email;
    this._requestInProgress = false;
    this._override = "confirm";
    this._clearAutoLoginFailure();
    fireEvent(this, "cloud-email-changed", { value: email });
    fireEvent(this, "cloud-auto-login-started");
    fireEvent(this, "ha-refresh-cloud-status");
    await this.updateComplete;
    this._confirmTitle?.focus();
  }

  private async _localizeBackendMessage(
    key: string,
    domain = "cloud",
    placeholders?: Record<string, string>
  ): Promise<string | undefined> {
    const localize = await this.hass.loadBackendTranslation(
      "exceptions",
      domain
    );
    return (
      localize(`component.${domain}.exceptions.${key}.message`, placeholders) ||
      undefined
    );
  }

  private async _websocketErrorMessage(err: any): Promise<string> {
    if (err?.translation_key) {
      const message = await this._localizeBackendMessage(
        err.translation_key,
        err.translation_domain,
        err.translation_placeholders
      );
      if (message) {
        return message;
      }
    }
    return err?.message || this.hass.localize("ui.common.unknown_error");
  }

  private async _resolveAutoLoginError(key: string | null) {
    if (!key) {
      this._autoLoginError = undefined;
      return;
    }

    let reason: string | undefined;
    try {
      reason = await this._localizeBackendMessage(key);
    } catch (_err) {
      // The translation load rejects when the socket drops mid-round-trip. The
      // generic reason still has to land: the status reports this failure once
      // and nothing else would take the user off the waiting view.
    }

    if (this._failedKey !== key) {
      // A newer status superseded this failure while the lookup was in flight.
      return;
    }

    this._error = undefined;
    this._success = undefined;
    this._autoLoginError =
      reason ||
      this.hass.localize("ui.panel.config.cloud.register.auto_login_failed");
  }

  private async _handleAttemptNow() {
    if (this._attemptInProgress) {
      return;
    }
    this._attemptInProgress = true;

    try {
      await attemptCloudAutoLoginNow(this.hass);
    } catch (err: any) {
      showToast(this, { message: await this._websocketErrorMessage(err) });
      return;
    } finally {
      this._attemptInProgress = false;
    }

    showToast(this, {
      message: {
        translationKey: "ui.panel.config.cloud.register.checking_confirmation",
      },
    });
  }

  private async _handleResendVerifyEmail() {
    if (this._resendInProgress) {
      return;
    }

    this._error = undefined;
    this._success = undefined;
    this._resendInProgress = true;

    try {
      await resendCloudAutoLoginConfirm(this.hass);
      this._success = this.hass.localize(
        "ui.panel.config.cloud.register.verification_email_sent"
      );
    } catch (err: any) {
      this._error = await this._websocketErrorMessage(err);
    } finally {
      this._resendInProgress = false;
    }
  }

  static get styles() {
    return [
      haStyle,
      cloudSignedOutStyle,
      css`
        :host {
          display: block;
        }
        :host([card-less]) .card-header-block,
        :host([card-less]) .confirm {
          padding-inline: 0;
        }
        :host([card-less]) .card-header-block h1 {
          margin: 0;
          text-align: center;
        }
        :host([card-less]) .confirm h1 {
          margin: 0;
        }

        .card-header-block {
          padding: var(--ha-space-4) var(--ha-space-4) 0;
        }
        .card-header-block p {
          margin: var(--ha-space-2) 0 0;
          color: var(--secondary-text-color);
          line-height: var(--ha-line-height-normal);
        }

        .register-form {
          display: flex;
          flex-direction: column;
        }
        .terms {
          margin: var(--ha-space-2) 0 0;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          line-height: var(--ha-line-height-normal);
        }
        .terms a,
        .footnote a,
        .footnote button.link {
          color: var(--primary-color);
        }

        .card-actions.split {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .card-actions.confirm-actions {
          border-top: none;
        }

        .confirm {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--ha-space-3);
          padding: var(--ha-space-8) var(--ha-space-4) var(--ha-space-5);
        }
        .confirm ha-alert {
          width: 100%;
          text-align: initial;
        }
        .confirm-icon {
          width: 56px;
          height: 56px;
          border-radius: var(--ha-border-radius-pill);
          background: color-mix(in srgb, var(--info-color) 18%, transparent);
          color: var(--info-color);
          display: flex;
          align-items: center;
          justify-content: center;
          --mdc-icon-size: 28px;
        }
        /* Focused programmatically to announce the view; no visible ring. */
        #confirm-title:focus {
          outline: none;
        }
        .confirm p {
          margin: 0;
          max-width: 420px;
          color: var(--secondary-text-color);
          line-height: var(--ha-line-height-normal);
        }
        .confirm .email {
          display: inline-block;
          max-width: 100%;
          overflow-wrap: anywhere;
        }
        .waiting {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
        }

        .footnote {
          display: block;
          width: 100%;
          margin: var(--ha-space-3) auto 0;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          text-align: center;
          text-wrap: pretty;
        }

        @media (max-width: 500px) {
          .card-actions.split {
            flex-direction: column;
            align-items: stretch;
            gap: var(--ha-space-2);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-register-card": CloudRegisterCard;
  }

  interface HASSDomEvents {
    "cloud-cancel-auto-login": undefined;
    "cloud-auto-login-started": undefined;
    "cloud-register-view-changed": { confirming: boolean };
    "cloud-sign-in-instead": undefined;
  }
}
