import { mdiAlertCircleOutline, mdiCheck, mdiLock } from "@mdi/js";
import { HTMLTemplateResult, LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { toASCII } from "punycode";
import { extractSearchParamsObject } from "../common/url/search-params";
import type { AuthProvider } from "../data/auth";
import type { HaFormSchema } from "../components/ha-form/types";
import type { DataEntryFlowStep } from "../data/data_entry_flow";
import { litLocalizeLiteMixin } from "../mixins/lit-localize-lite-mixin";

import { finish, loadStep, makeIcon } from "./utils";
import "./ha-authorize-field";

const query = extractSearchParamsObject();
const appNames: Record<string, string> = {
  "https://home-assistant.io/iOS": "iOS",
  "https://home-assistant.io/android": "Android",
};
let initialState:
  | {
      redirectUri: URL;
      clientId: string;
      mode:
        | { name: "login" }
        | { name: "app"; data: string }
        | { name: "client"; data: string };
    }
  | { error: string };

type InitialState = {
  redirectUri: URL;
  clientId: string;
  mode:
    | {
        name: "login";
      }
    | {
        name: "app";
        data: string;
      }
    | {
        name: "client";
        data: string;
      };
};
try {
  const _redirectUri = new URL(query.redirect_uri);
  if (
    // eslint-disable-next-line no-script-url
    ["javascript:", "data:", "vbscript:", "file:", "about:"].includes(
      _redirectUri.protocol
    )
  ) {
    initialState = { error: "Invalid redirect URI" };
  } else {
    const redirectUri = _redirectUri;
    const clientId = query.client_id;
    initialState = {
      redirectUri,
      clientId,
      mode:
        _redirectUri.host === location.host
          ? { name: "login" }
          : clientId && clientId in appNames
          ? { name: "app", data: appNames[clientId] }
          : { name: "client", data: clientId && toASCII(clientId) },
    };
  }
} catch (e) {
  initialState = { error: "Invalid redirect URI" };
}

@customElement("ha-authorize")
export class HaAuthorize extends litLocalizeLiteMixin(LitElement) {
  @property()
  public translationFragment = "page-authorize";

  @state()
  private _error: string | undefined =
    "error" in initialState ? initialState.error : undefined;

  @state()
  private _finished = false;

  @state()
  private _authProviders: AuthProvider[] | undefined;

  @state()
  private _authProvider: AuthProvider | undefined;

  @state()
  private _step: DataEntryFlowStep | undefined;

  @state()
  private _storeToken = true;

  protected async firstUpdated() {
    if (this._error) return;

    const authProvidersResp = await ((window as any).providersPromise ||
      fetch("/auth/providers", {
        credentials: "same-origin",
      }));
    const authProviders = await authProvidersResp.json();
    this._authProviders = authProviders;

    if (
      authProvidersResp.status === 400 &&
      authProviders.code === "onboarding_required"
    ) {
      location.href = `/onboarding.html${location.search}`;
      return;
    }

    if (authProviders.length === 0) {
      this._error = "No auth providers";
      return;
    }

    const authProvider = authProviders[0];
    this._authProvider = authProvider;

    const { redirectUri, clientId } = initialState as InitialState;
    const step = await loadStep(
      this._step,
      clientId,
      authProvider,
      redirectUri
    );
    if (step.success) {
      this._step = step.data;
    } else {
      this._error = "Error while loading next step";
      this._error = `${await step.message} while loading next step`;
    }
  }

  protected render() {
    if (this._error)
      return html`
        ${makeIcon(mdiAlertCircleOutline, "error")}
        <p>${this._error}</p>
      `;
    if (this._finished)
      return html`
        ${makeIcon(mdiCheck, "info")}
        <p>${this.localize("ui.panel.page-authorize.logging_in")}</p>
      `;

    if (!this._authProviders || !this._authProvider) return nothing;

    const { redirectUri, clientId, mode } = initialState as InitialState;
    const header = this.localize(
      `ui.panel.page-authorize.heading_${mode.name}`
    );

    if (!header) return nothing;

    let error: HTMLTemplateResult | string | undefined;
    const fields: { item: HaFormSchema; name: string }[] = [];
    if (this._step?.type === "form") {
      if (this._step.errors?.base) {
        error = this.localize(
          `ui.panel.page-authorize.form.providers.${this._authProvider.type}.error.${this._step.errors.base}`
        );
      }
      for (const item of this._step.data_schema) {
        const name = this.localize(
          `ui.panel.page-authorize.form.providers.${this._authProvider.type}.step.${this._step.step_id}.data.${item.name}`
        );
        fields.push({ item, name });
      }
    } else if (this._step?.type === "abort") {
      error = html`${this.localize("ui.panel.page-authorize.abort_intro")}
        <br />
        ${this.localize(
          `ui.panel.page-authorize.form.providers.${this._authProvider.type}.abort.${this._step.reason}`
        )}`;
    }

    const buttons: HTMLTemplateResult[] = [];
    for (const provider of this._authProviders) {
      if (provider === this._authProvider) continue;
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      const useOtherMethod = async () => {
        const result = await loadStep(
          this._step,
          clientId,
          provider,
          redirectUri
        );
        if (!result.success) {
          this._error = "Error while loading next step";
          this._error = `${await result.message} while loading next step`;
          return;
        }
        this._authProvider = provider;
        this._step = result.data;
      };
      buttons.push(
        html`<button class="tonal" type="button" @click=${useOtherMethod}>
          ${this.localize("ui.panel.page-authorize.button_use_other_method", {
            method: provider.name,
          })}
        </button>`
      );
    }
    if (this._step?.type === "form") {
      buttons.push(
        html`<button class="main">
          ${this.localize("ui.panel.page-authorize.form.next")}
        </button>`
      );
    } else if (this._step?.type === "abort") {
      const provider = this._authProvider;
      const startOver = async () => {
        const result = await loadStep(
          this._step,
          clientId,
          provider,
          redirectUri
        );
        if (!result.success) {
          this._error = "Error while loading next step";
          this._error = `${await result.message} while loading next step`;
          return;
        }
        this._authProvider = provider;
        this._step = result.data;
      };
      buttons.push(
        html`<button class="main" type="button" @click=${startOver}>
          ${this.localize("ui.panel.page-authorize.button_start_over", {
            method: provider.name,
          })}
        </button>`
      );
    }

    return html`
      ${makeIcon(mdiLock, "info")}
      <h1>${header}</h1>
      ${mode.name === "app"
        ? html`<p class="secondary">
            ${this.localize("ui.panel.page-authorize.text_app", {
              platform: mode.data,
            })}
          </p>`
        : mode.name === "client"
        ? html`<p class="secondary">
            ${this.localize("ui.panel.page-authorize.text_client", {
              clientId: mode.data,
            })}
          </p>`
        : nothing}
      <form @submit=${this._nextStep}>
        ${error
          ? html`<div class="error">
              ${makeIcon(mdiAlertCircleOutline, "error")} ${error}
            </div>`
          : nothing}
        ${this._step?.type === "form"
          ? html`
              ${repeat(
                fields,
                ({ item }) => item.name,
                ({ item, name }) =>
                  html`<ha-authorize-field
                    .schema=${item}
                    .name=${name}
                  ></ha-authorize-field>`
              )}
              ${this._step.step_id !== "select_mfa_module" &&
              this._step.step_id !== "mfa" &&
              mode.name === "login"
                ? html`<label>
                    <input
                      type="checkbox"
                      .checked=${this._storeToken}
                      @input=${this._toggleStoreToken}
                    />
                    ${this.localize("ui.panel.page-authorize.store_token")}
                  </label>`
                : nothing}
            `
          : nothing}
        ${buttons.length > 0
          ? html`<div class="buttons">${buttons}</div>`
          : nothing}
      </form>
    `;
  }

  private async _nextStep(
    event: SubmitEvent & { currentTarget: HTMLFormElement }
  ) {
    event.preventDefault();
    const formdata = new FormData(event.currentTarget);
    const { redirectUri, clientId } = initialState as InitialState;
    const data = {
      ...Object.fromEntries(formdata),
      client_id: clientId,
    };

    const response = await fetch(`/auth/login_flow/${this._step!.flow_id}`, {
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      this._error = "Error while loading next step";
      const result = await response.json();
      this._error = `${result.message} while loading next step`;
      return;
    }
    const step = await response.json();
    if (step.type === "create_entry") {
      this._finished = true;
      finish(redirectUri, {
        code: step.result as unknown as string,
        state: query.state,
        storeToken: this._storeToken ? "true" : undefined,
      });
      return;
    }
    this._step = step;
  }

  private _toggleStoreToken(
    e: InputEvent & { currentTarget: HTMLInputElement }
  ) {
    this._storeToken = e.currentTarget.checked;
  }

  protected createRenderRoot() {
    return this;
  }
}

const styleTag = document.createElement("style");
styleTag.innerText = `
h1 {
  font-size: 24px;
  line-height: 32px;
  font-weight: 400;
  margin: 0;
}
svg {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
svg.error {
  color: var(--error-color);
}
svg.info {
  color: var(--tinted-text-color);
}
p {
  margin: 0;
}
p.secondary {
  opacity: 0.8;
}
form {
  display: contents;
}
button {
  font-family: inherit;
  font-weight: 500;
  border: none;
  cursor: pointer;
  white-space: nowrap;
}


div.error {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  padding: 12px 14px;
  border-radius: 16px;
  background-color: rgb(var(--rgb-error-color), 0.2);
  
  align-self: stretch;
  margin-bottom: 8px;
}

ha-authorize-field {
  display: flex;
  position: relative;
  overflow: hidden;
  flex-direction: column;

  align-self: stretch;
  border-radius: 4px 4px 0 0;
}
input:is([type=text], [type=number], [type=password]), select {
  background-color: transparent;
  color: inherit;
  border: none;
  height: 48px;
  padding: 0 16px;
  font-family: inherit;
  font-size: inherit;
}
input::placeholder {
  color: inherit;
  opacity: var(--text-opacity);
}
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  appearance: none;
}
input[type=number] {
  appearance: textfield;
}
input:focus-visible + .bar, select:focus-visible + .bar {
  background-color: var(--primary-color);
  height: 4px;
}
.bar {
  position: absolute;
  background-color: var(--bar-color);
  height: 2px;
  width: 100%;
  bottom: 0;
  pointer-events: none;
  transition: all 200ms;
}
ha-authorize-field > button {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: var(--text-opacity);

  width: 40px;
  height: 40px;
  top: 4px;
  right: 4px;
  padding: 0;
  border-radius: 20px;
  background-color: transparent;
}
ha-authorize-field > button:hover {
  background-color: inherit;
}
input:is([type=text], [type=number], [type=password]):focus-visible, select:focus-visible {
  outline: none;
}

select {
  padding: 20px 12px 6px 12px;
}
.name {
  position: absolute;
  left: 16px;
  top: 6px;
  font-size: 12px;
  opacity: var(--text-opacity);
  pointer-events: none;
}
@supports (-moz-appearance: none) {
  select {
    padding-left: 16px;
    padding-right: 16px;
  }
}

label {
  display: flex;
  align-items: center;
  height: 48px;
  align-self: stretch;
  cursor: pointer;
}
input[type=checkbox] {
  width: 18px;
  height: 18px;
  margin: 0 16px 0 0;
  cursor: pointer;
}

ha-authorize-field + .buttons {
  margin-top: 8px;
}
.buttons {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}
.buttons > button {
  height: 40px;
  border-radius: 20px;
}
button.tonal {
  background-color: rgb(var(--rgb-primary-color), 0.2);
  color: var(--tinted-text-color);
  padding: 0 20px;
}
button.main {
  background-color: var(--primary-color);
  color: var(--text-primary-color);
  padding: 0 20px;
}
@media (min-width: 32rem) {
  .buttons {
    flex-direction: row;
  }
}
`;
document.head.appendChild(styleTag);
