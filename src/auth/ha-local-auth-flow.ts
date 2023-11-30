/* eslint-disable lit/prefer-static-styles */
import "@material/mwc-button";
import { mdiEye, mdiEyeOff } from "@mdi/js";
import { html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-alert";
import "../components/ha-button";
import "../components/ha-icon-button";
import "../components/user/ha-person-badge";
import {
  AuthProvider,
  createLoginFlow,
  deleteLoginFlow,
  redirectWithAuthCode,
  submitLoginFlow,
} from "../data/auth";
import { DataEntryFlowStep } from "../data/data_entry_flow";
import { BasePerson, listUserPersons } from "../data/person";
import "./ha-auth-textfield";
import type { HaAuthTextField } from "./ha-auth-textfield";

@customElement("ha-local-auth-flow")
export class HaLocalAuthFlow extends LitElement {
  @property({ attribute: false }) public authProvider?: AuthProvider;

  @property({ attribute: false }) public authProviders?: AuthProvider[];

  @property() public clientId?: string;

  @property() public redirectUri?: string;

  @property() public oauth2State?: string;

  @property({ type: Boolean }) public ownInstance = false;

  @property() public localize!: LocalizeFunc;

  @state() private _error?: string;

  @state() private _step?: DataEntryFlowStep;

  @state() private _submitting = false;

  @state() private _persons?: Record<string, BasePerson>;

  @state() private _selectedUser?: string;

  @state() private _unmaskedPassword = false;

  createRenderRoot() {
    return this;
  }

  willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._load();
    }
  }

  protected render() {
    if (!this.authProvider?.users || !this._persons) {
      return nothing;
    }
    const userIds = Object.keys(this.authProvider.users).filter(
      (userId) => userId in this._persons!
    );
    return html`
      <style>
        .content {
          max-width: 560px;
        }
        .persons {
          margin-top: 24px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          justify-content: center;
        }
        .persons.force-small {
          max-width: 350px;
        }
        .person {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          text-align: center;
          cursor: pointer;
          width: 80px;
        }
        .person[role="button"] {
          outline: none;
          padding: 8px;
          border-radius: 4px;
        }
        .person[role="button"]:focus-visible {
          background: rgba(var(--rgb-primary-color), 0.1);
        }
        .person p {
          margin-bottom: 0;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          width: 100%;
        }
        ha-person-badge {
          width: 80px;
          height: 80px;
          --person-badge-font-size: 2em;
        }
        form {
          width: 100%;
        }
        ha-auth-textfield {
          display: block !important;
          position: relative;
        }
        ha-auth-textfield ha-icon-button {
          position: absolute;
          top: 4px;
          right: 4px;
          z-index: 9;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 336px;
          margin-top: 24px;
        }
        .login-form .person {
          cursor: default;
          width: auto;
        }
        .login-form .person p {
          font-size: 28px;
          margin-top: 24px;
          margin-bottom: 32px;
          line-height: normal;
        }
        .login-form ha-person-badge {
          width: 120px;
          height: 120px;
          --person-badge-font-size: 3em;
        }
        ha-list-item {
          margin-top: 16px;
        }
        ha-button {
          --mdc-typography-button-text-transform: none;
        }
        a.forgot-password {
          color: var(--primary-color);
          text-decoration: none;
          font-size: 0.875rem;
        }
        button {
          color: var(--primary-color);
          background: none;
          border: none;
          padding: 8px;
          font: inherit;
          font-size: 0.875rem;
          text-align: left;
          cursor: pointer;
          outline: none;
          border-radius: 4px;
        }
        button:focus-visible {
          background: rgba(var(--rgb-primary-color), 0.1);
        }
      </style>
      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : ""}
      ${this._step
        ? html`<ha-auth-flow
            .clientId=${this.clientId}
            .redirectUri=${this.redirectUri}
            .oauth2State=${this.oauth2State}
            .step=${this._step}
            storeToken
            .localize=${this.localize}
          ></ha-auth-flow>`
        : this._selectedUser
          ? html`<div class="login-form"><div class="person">
              <ha-person-badge
                .person=${this._persons[this._selectedUser]}
              ></ha-person-badge>
              <p>${this._persons[this._selectedUser].name}</p>
            </div>
            <form>
              <input
                type="hidden"
                name="username"
                autocomplete="username"
                .value=${this.authProvider.users[this._selectedUser]}
              />
              <ha-auth-textfield
              .type=${this._unmaskedPassword ? "text" : "password"}
                id="password"
                name="password"
        .label=${this.localize(
          "ui.panel.page-authorize.form.providers.homeassistant.step.init.data.password"
        )}
        required
        autoValidate
        autocomplete
        iconTrailing
        validationMessage="Required"
              >
              <ha-icon-button
        toggles
        .label=${
          this.localize(
            this._unmaskedPassword
              ? "ui.panel.page-authorize.form.hide_password"
              : "ui.panel.page-authorize.form.show_password"
          ) || (this._unmaskedPassword ? "Hide password" : "Show password")
        }
        @click=${this._toggleUnmaskedPassword}
        .path=${this._unmaskedPassword ? mdiEyeOff : mdiEye}
      ></ha-icon-button>
    </ha-auth-textfield>
      </div>
              <div class="action space-between">
              <mwc-button
                  @click=${this._restart}
                  .disabled=${this._submitting}
                >
                  ${this.localize("ui.panel.page-authorize.form.previous")}
                </mwc-button>
              <mwc-button
                  raised
                  @click=${this._handleSubmit}
                  .disabled=${this._submitting}
                >
                  ${this.localize("ui.panel.page-authorize.form.next")}
                </mwc-button>
              </div>
              <div class="action">
              <a class="forgot-password"
                  href="https://www.home-assistant.io/docs/locked_out/#forgot-password"
                  target="_blank"
                  rel="noreferrer noopener"
                  >${this.localize(
                    "ui.panel.page-authorize.forgot_password"
                  )}</a
                >
                </div>
            </form>`
          : html`<h1>
                ${this.localize("ui.panel.page-authorize.welcome_home")}
              </h1>
              ${this.localize("ui.panel.page-authorize.who_is_logging_in")}
              <div
                class="persons ${userIds.length < 10 && userIds.length % 4 === 1
                  ? "force-small"
                  : ""}"
              >
                ${userIds.map((userId) => {
                  const person = this._persons![userId];

                  return html`<div
                    class="person"
                    .userId=${userId}
                    @click=${this._personSelected}
                    @keyup=${this._handleKeyUp}
                    role="button"
                    tabindex="0"
                  >
                    <ha-person-badge .person=${person}></ha-person-badge>
                    <p>${person.name}</p>
                  </div>`;
                })}
              </div>
              <div class="action">
                <button @click=${this._otherLogin} tabindex="0">
                  ${this.localize("ui.panel.page-authorize.other_options")}
                </button>
              </div>`}
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    this.addEventListener("keypress", (ev) => {
      if (ev.key === "Enter") {
        this._handleSubmit(ev);
      }
    });
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("_selectedUser") && this._selectedUser) {
      const passwordElement = this.renderRoot.querySelector(
        "#password"
      ) as HaAuthTextField;
      passwordElement.updateComplete.then(() => {
        passwordElement.focus();
      });
    }
  }

  private async _load() {
    try {
      this._persons = await listUserPersons();
    } catch {
      this._persons = {};
      this._error = "Failed to fetch persons";
    }
  }

  private _restart() {
    this._selectedUser = undefined;
    this._error = undefined;
  }

  private _toggleUnmaskedPassword() {
    this._unmaskedPassword = !this._unmaskedPassword;
  }

  private _handleKeyUp(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      this._personSelected(ev);
    }
  }

  private async _personSelected(ev) {
    const userId = ev.currentTarget.userId;
    if (
      this.ownInstance &&
      this.authProviders?.find((prv) => prv.type === "trusted_networks")
    ) {
      try {
        const flowResponse = await createLoginFlow(
          this.clientId,
          this.redirectUri,
          ["trusted_networks", null]
        );

        const data = await flowResponse.json();

        if (data.type === "create_entry") {
          redirectWithAuthCode(
            this.redirectUri!,
            data.result,
            this.oauth2State,
            true
          );
          return;
        }

        try {
          if (!data.data_schema[0].options.find((opt) => opt[0] === userId)) {
            throw new Error("User not available");
          }

          const postData = { user: userId, client_id: this.clientId };

          const response = await submitLoginFlow(data.flow_id, postData);

          if (response.ok) {
            const result = await response.json();

            if (result.type === "create_entry") {
              redirectWithAuthCode(
                this.redirectUri!,
                result.result,
                this.oauth2State,
                true
              );
              return;
            }
          } else {
            throw new Error("Invalid response");
          }
        } catch {
          deleteLoginFlow(data.flow_id).catch((err) => {
            // eslint-disable-next-line no-console
            console.error("Error delete obsoleted auth flow", err);
          });
        }
      } catch {
        // Ignore
      }
    }
    this._selectedUser = userId;
  }

  private async _handleSubmit(ev: Event) {
    ev.preventDefault();

    if (!this.authProvider?.users || !this._selectedUser) {
      return;
    }

    this._error = undefined;
    this._submitting = true;

    const flowResponse = await createLoginFlow(
      this.clientId,
      this.redirectUri,
      ["homeassistant", null]
    );

    const data = await flowResponse.json();

    const postData = {
      username: this.authProvider.users[this._selectedUser],
      password: (this.renderRoot.querySelector("#password") as HaAuthTextField)
        .value,
      client_id: this.clientId,
    };

    try {
      const response = await submitLoginFlow(data.flow_id, postData);

      const newStep = await response.json();

      if (response.status === 403) {
        this._error = newStep.message;
        return;
      }

      if (newStep.type === "create_entry") {
        redirectWithAuthCode(
          this.redirectUri!,
          newStep.result,
          this.oauth2State,
          true
        );
        return;
      }

      if (newStep.errors.base) {
        this._error = this.localize(
          `ui.panel.page-authorize.form.providers.homeassistant.error.${newStep.errors.base}`
        );
        throw new Error(this._error);
      }

      this._step = newStep;
    } catch {
      deleteLoginFlow(data.flow_id).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Error delete obsoleted auth flow", err);
      });
      if (!this._error) {
        this._error = this.localize(
          "ui.panel.page-authorize.form.unknown_error"
        );
      }
    } finally {
      this._submitting = false;
    }
  }

  private _otherLogin() {
    fireEvent(this, "default-login-flow", { value: true });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-local-auth-flow": HaLocalAuthFlow;
  }
  interface HASSDomEvents {
    "default-login-flow": { value: boolean };
  }
}
