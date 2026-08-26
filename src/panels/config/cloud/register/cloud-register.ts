import { mdiEmailCheckOutline } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
import "../../../../components/buttons/ha-progress-button";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-spinner";
import "../../../../components/ha-svg-icon";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import type { CloudAutoLogin, CloudStatus } from "../../../../data/cloud";
import {
  attemptCloudAutoLoginNow,
  cloudRegisterAutoLogin,
  resendCloudAutoLoginConfirm,
  subscribeCloudEvents,
} from "../../../../data/cloud";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import "../cloud-signed-out-menu";
import { cloudSignedOutStyle } from "../cloud-signed-out-style";
import { cloudSubpageStyle } from "../account/cloud-subpage-style";

const BACK_PATH = "/config/cloud/start";

@customElement("cloud-register")
export class CloudRegister extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property() public email?: string;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @state() private _view: "form" | "confirm" = "form";

  @state() private _requestInProgress = false;

  @state() private _resendInProgress = false;

  @state() private _autoLoginError?: string;

  @state() private _error?: string;

  @state() private _success?: string;

  @state() private _registeredEmail = "";

  private _unsubCloudEvents?: Promise<UnsubscribeFunc>;

  @query("#email") private _emailField?: HaInput;

  @query("#password") private _passwordField?: HaInput;

  @query("#confirm-title") private _confirmTitle?: HTMLElement;

  private get _autoLogin(): CloudAutoLogin | null {
    const status = this.cloudStatus;
    if (!status || status.logged_in) {
      return null;
    }
    return status.auto_login ?? null;
  }

  private get _pendingEmail(): string {
    return this._registeredEmail || this._autoLogin?.email || "";
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this._autoLogin) {
      this._view = "confirm";
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopWatchingAutoLogin();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (this._view !== "confirm") {
      return;
    }

    const failedKey = this._autoLogin?.failed;
    if (failedKey && !this._autoLoginError) {
      this._failAutoLogin(failedKey);
      return;
    }

    this._watchAutoLogin();
  }

  protected render(): TemplateResult {
    const confirming = this._view === "confirm";
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path=${BACK_PATH}
        .backCallback=${confirming ? this._handleConfirmBack : undefined}
        .header=${this.hass.localize("ui.panel.config.cloud.register.headline")}
      >
        <cloud-signed-out-menu
          slot="toolbar-icon"
          .hass=${this.hass}
        ></cloud-signed-out-menu>
        <div class="content">
          ${confirming ? this._renderConfirm() : this._renderForm()}
        </div>
      </hass-subpage>
    `;
  }

  private _renderForm(): TemplateResult {
    return html`
      <ha-card outlined>
        <div class="card-header-block">
          <h2>
            ${this.hass.localize(
              "ui.panel.config.cloud.register.create_account"
            )}
          </h2>
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
            ${this.hass.localize(
              "ui.panel.config.cloud.register.terms_notice",
              {
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
              }
            )}
          </p>
        </div>
        <div class="card-actions split">
          <ha-button
            appearance="plain"
            .disabled=${this._requestInProgress}
            @click=${this._handleSignInInstead}
          >
            ${this.hass.localize(
              "ui.panel.config.cloud.register.sign_in_instead"
            )}
          </ha-button>
          <ha-progress-button
            @click=${this._handleRegister}
            .progress=${this._requestInProgress}
            >${this.hass.localize(
              "ui.panel.config.cloud.register.start_trial"
            )}</ha-progress-button
          >
        </div>
      </ha-card>
    `;
  }

  private _renderConfirm(): TemplateResult {
    return html`
      <ha-card outlined>
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
          <h2 id="confirm-title" tabindex="-1">
            ${this.hass.localize(
              "ui.panel.config.cloud.register.check_your_email"
            )}
          </h2>
          <p>
            ${this.hass.localize(
              "ui.panel.config.cloud.register.confirm_email_body",
              { email: this._pendingEmail }
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
              : html`<ha-button
                  appearance="accent"
                  @click=${this._handleAttemptNow}
                >
                  ${this.hass.localize(
                    "ui.panel.config.cloud.register.clicked_confirm"
                  )}
                </ha-button>`
          }
        </div>
      </ha-card>
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
    const confirming = this._view === "confirm";
    fireEvent(this, "cloud-email-changed", {
      // The field wins on the form: it holds whatever was typed after a cancel.
      value: this._emailField?.value || this._pendingEmail || this.email || "",
    });
    this._stopWatchingAutoLogin();
    if (confirming) {
      fireEvent(this, "cloud-cancel-auto-login");
    }
    // Replaces only from the waiting view, whose registration is being
    // cancelled: browser-back must not return to it. The form is a page worth
    // going back to.
    navigate("/config/cloud/login", { replace: confirming });
  }

  private _handleConfirmBack = () => {
    this._stopWatchingAutoLogin();
    fireEvent(this, "cloud-cancel-auto-login");
    navigate(BACK_PATH, { replace: true });
  };

  private _handleCancelPending() {
    this._resetToForm();
    fireEvent(this, "cloud-cancel-auto-login");
  }

  private _resetToForm() {
    this._stopWatchingAutoLogin();
    this._view = "form";
    this._autoLoginError = undefined;
    this._registeredEmail = "";
    this._error = undefined;
    this._success = undefined;
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
    this._view = "confirm";
    this._autoLoginError = undefined;
    fireEvent(this, "cloud-email-changed", { value: email });
    fireEvent(this, "cloud-auto-login-started");
    fireEvent(this, "ha-refresh-cloud-status");
    this._watchAutoLogin();
    await this.updateComplete;
    this._confirmTitle?.focus();
  }

  private _watchAutoLogin() {
    if (this._unsubCloudEvents || this._autoLoginError) {
      return;
    }

    const subscription = subscribeCloudEvents(this.hass, (event) => {
      if (event.type === "login") {
        fireEvent(this, "ha-refresh-cloud-status");
      } else if (event.type === "auto_login_failed") {
        this._failAutoLogin(event.translation_key);
      } else if (event.type === "auto_login_cancelled") {
        this._resetToForm();
        fireEvent(this, "ha-refresh-cloud-status");
      }
    });
    this._unsubCloudEvents = subscription;

    subscription.catch(() => {
      if (this._unsubCloudEvents === subscription) {
        this._unsubCloudEvents = undefined;
      }
    });
  }

  private async _localizeBackendMessage(
    key: string,
    domain = "cloud"
  ): Promise<string | undefined> {
    const localize = await this.hass.loadBackendTranslation(
      "exceptions",
      domain
    );
    return (
      localize(`component.${domain}.exceptions.${key}.message`) || undefined
    );
  }

  private async _websocketErrorMessage(err: any): Promise<string> {
    if (err?.translation_key) {
      const message = await this._localizeBackendMessage(
        err.translation_key,
        err.translation_domain
      );
      if (message) {
        return message;
      }
    }
    return err?.message || this.hass.localize("ui.common.unknown_error");
  }

  private async _failAutoLogin(translationKey?: string | null) {
    this._stopWatchingAutoLogin();
    const reason = translationKey
      ? await this._localizeBackendMessage(translationKey)
      : undefined;
    this._error = undefined;
    this._success = undefined;
    this._autoLoginError =
      reason ||
      this.hass.localize("ui.panel.config.cloud.register.auto_login_failed");
    fireEvent(this, "ha-refresh-cloud-status");
  }

  private _stopWatchingAutoLogin() {
    this._unsubCloudEvents?.then((unsub) => unsub()).catch(() => undefined);
    this._unsubCloudEvents = undefined;
  }

  private async _handleAttemptNow() {
    this._watchAutoLogin();

    try {
      await attemptCloudAutoLoginNow(this.hass);
    } catch (err: any) {
      showToast(this, { message: await this._websocketErrorMessage(err) });
      return;
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
      cloudSubpageStyle,
      cloudSignedOutStyle,
      css`
        .content {
          gap: var(--ha-space-3);
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
          max-width: 600px;
          margin: 0 auto;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          text-align: center;
          text-wrap: pretty;
        }

        /* Not column-reverse: that paints the buttons against DOM order, so
           keyboard and screen-reader users reach them back to front. */
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
    "cloud-register": CloudRegister;
  }

  interface HASSDomEvents {
    "cloud-cancel-auto-login": undefined;
    "cloud-auto-login-started": undefined;
  }
}
