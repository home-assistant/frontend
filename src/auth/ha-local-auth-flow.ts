/* eslint-disable lit/prefer-static-styles */
import "@material/mwc-button";
import { html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-alert";
import "../components/user/ha-person-badge";
import { AuthProvider } from "../data/auth";
import { listPersons } from "../data/person";
import "./ha-auth-textfield";
import type { HaAuthTextField } from "./ha-auth-textfield";
import { DataEntryFlowStep } from "../data/data_entry_flow";
import { fireEvent } from "../common/dom/fire_event";

@customElement("ha-local-auth-flow")
export class HaLocalAuthFlow extends LitElement {
  @property({ attribute: false }) public authProvider?: AuthProvider;

  @property({ attribute: false }) public authProviders?: AuthProvider[];

  @property() public clientId?: string;

  @property() public redirectUri?: string;

  @property() public oauth2State?: string;

  @property() public localize!: LocalizeFunc;

  @state() private _error?: string;

  @state() private _step?: DataEntryFlowStep;

  @state() private _submitting = false;

  @state() private _persons?: Promise<Record<string, string>>;

  @state() private _selectedUser?: string;

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
    return html`
      <style>
        .persons {
          display: flex;
          gap: 16px;
        }
        .person {
          flex-shrink: 0;
          text-align: center;
          cursor: pointer;
        }
        .person p {
          margin-bottom: 0;
        }
        ha-person-badge {
          width: 120px;
          height: 120px;
          --person-badge-font-size: 3em;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .login-form .person {
          cursor: default;
        }
        .login-form ha-auth-textfield {
          margin-top: 16px;
        }
        .action {
          margin: 24px 0 8px;
          text-align: center;
        }
        ha-list-item {
          margin-top: 16px;
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
                .person=${this._persons![this._selectedUser]}
              ></ha-person-badge>
              <p>${this._persons![this._selectedUser].name}</p>
            </div>
            <form>
              <input
                type="hidden"
                name="username"
                autocomplete="username"
                .value=${this.authProvider.users[this._selectedUser]}
              />
              <ha-auth-textfield
                type="password"
                id="password"
              ></ha-auth-textfield>
      </div>
              <div class="action">
                <mwc-button
                  raised
                  @click=${this._handleSubmit}
                  .disabled=${this._submitting}
                >
                  ${this.localize("ui.panel.page-authorize.form.next")}
                </mwc-button>
              </div>
            </form>`
          : html`<div class="persons">
                ${Object.keys(this.authProvider.users).map((userId) => {
                  const person = this._persons![userId];
                  return html`<div
                    class="person"
                    .userId=${userId}
                    @click=${this._personSelected}
                  >
                    <ha-person-badge .person=${person}></ha-person-badge>
                    <p>${person.name}</p>
                  </div>`;
                })}
              </div>
              <ha-list-item hasMeta role="button" @click=${this._otherLogin}>
                Other options
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item>`}
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
    this._persons = await (await listPersons()).json();
  }

  private async _personSelected(ev) {
    const userId = ev.currentTarget.userId;
    if (this.authProviders?.find((prv) => prv.type === "trusted_networks")) {
      try {
        const flowResponse = await fetch("/auth/login_flow", {
          method: "POST",
          credentials: "same-origin",
          body: JSON.stringify({
            client_id: this.clientId,
            handler: ["trusted_networks", null],
            redirect_uri: this.redirectUri,
          }),
        });

        const data = await flowResponse.json();

        if (data.type === "create_entry") {
          this._redirect(data.result);
          return;
        }

        try {
          if (!data.data_schema[0].options.find((opt) => opt[0] === userId)) {
            throw new Error("User not available");
          }

          const postData = { user: userId, client_id: this.clientId };

          const response = await fetch(`/auth/login_flow/${data.flow_id}`, {
            method: "POST",
            credentials: "same-origin",
            body: JSON.stringify(postData),
          });

          if (response.ok) {
            const result = await response.json();

            if (result.type === "create_entry") {
              this._redirect(result.result);
              return;
            }
          } else {
            throw new Error("Invalid response");
          }
        } catch {
          fetch(`/auth/login_flow/${data.flow_id}`, {
            method: "DELETE",
            credentials: "same-origin",
          }).catch((err) => {
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

    this._submitting = true;

    const flowResponse = await fetch("/auth/login_flow", {
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({
        client_id: this.clientId,
        handler: ["homeassistant", null],
        redirect_uri: this.redirectUri,
      }),
    });

    const data = await flowResponse.json();

    const postData = {
      username: this.authProvider.users[this._selectedUser],
      password: (this.renderRoot.querySelector("#password") as HaAuthTextField)
        .value,
      client_id: this.clientId,
    };

    try {
      const response = await fetch(`/auth/login_flow/${data.flow_id}`, {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify(postData),
      });

      const newStep = await response.json();

      if (response.status === 403) {
        this._error = newStep.message;
        return;
      }

      if (newStep.type === "create_entry") {
        this._redirect(newStep.result);
        return;
      }

      if (newStep.errors.base) {
        this._error = this.localize(
          `ui.panel.page-authorize.form.providers.homeassistant.error.${newStep.errors.base}`
        );
        return;
      }

      this._step = newStep;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error submitting step", err);
      this._error = this.localize("ui.panel.page-authorize.form.unknown_error");
    } finally {
      this._submitting = false;
    }
  }

  private _redirect(authCode: string) {
    // OAuth 2: 3.1.2 we need to retain query component of a redirect URI
    let url = this.redirectUri!;
    if (!url.includes("?")) {
      url += "?";
    } else if (!url.endsWith("&")) {
      url += "&";
    }

    url += `code=${encodeURIComponent(authCode)}`;

    if (this.oauth2State) {
      url += `&state=${encodeURIComponent(this.oauth2State)}`;
    }
    url += `&storeToken=true`;

    document.location.assign(url);
  }

  private _otherLogin() {
    fireEvent(this, "default-login-flow");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-local-auth-flow": HaLocalAuthFlow;
  }
  interface HASSDomEvents {
    "default-login-flow": undefined;
  }
}
