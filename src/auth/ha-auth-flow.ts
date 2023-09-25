/* eslint-disable lit/prefer-static-styles */
import "@material/mwc-button";
import { genClientId } from "home-assistant-js-websocket";
import { html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-alert";
import "../components/ha-checkbox";
import { computeInitialHaFormData } from "../components/ha-form/compute-initial-ha-form-data";
import "../components/ha-formfield";
import "../components/ha-markdown";
import { AuthProvider, autocompleteLoginFields } from "../data/auth";
import {
  DataEntryFlowStep,
  DataEntryFlowStepForm,
} from "../data/data_entry_flow";
import "./ha-auth-form";

type State = "loading" | "error" | "step";

@customElement("ha-auth-flow")
export class HaAuthFlow extends LitElement {
  @property({ attribute: false }) public authProvider?: AuthProvider;

  @property() public clientId?: string;

  @property() public redirectUri?: string;

  @property() public oauth2State?: string;

  @property() public localize!: LocalizeFunc;

  @state() private _state: State = "loading";

  @state() private _stepData?: Record<string, any>;

  @state() private _step?: DataEntryFlowStep;

  @state() private _errorMessage?: string;

  @state() private _submitting = false;

  @state() private _storeToken = false;

  createRenderRoot() {
    return this;
  }

  willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!changedProps.has("_step")) {
      return;
    }

    if (!this._step) {
      this._stepData = undefined;
      return;
    }

    const oldStep = changedProps.get("_step") as HaAuthFlow["_step"];

    if (
      !oldStep ||
      this._step.flow_id !== oldStep.flow_id ||
      (this._step.type === "form" &&
        oldStep.type === "form" &&
        this._step.step_id !== oldStep.step_id)
    ) {
      this._stepData =
        this._step.type === "form"
          ? computeInitialHaFormData(this._step.data_schema)
          : undefined;
    }
  }

  protected render() {
    return html`
      <style>
        ha-auth-flow .action {
          margin: 24px 0 8px;
          text-align: center;
        }
        ha-auth-flow .store-token {
          margin-top: 10px;
          margin-left: -16px;
        }
      </style>
      <form>${this._renderForm()}</form>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    if (this.clientId == null || this.redirectUri == null) {
      // eslint-disable-next-line no-console
      console.error(
        "clientId and redirectUri must not be null",
        this.clientId,
        this.redirectUri
      );
      this._state = "error";
      this._errorMessage = this._unknownError();
      return;
    }

    this.addEventListener("keypress", (ev) => {
      if (ev.key === "Enter") {
        this._handleSubmit(ev);
      }
    });
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("authProvider")) {
      this._providerChanged(this.authProvider);
    }

    if (!changedProps.has("_step") || this._step?.type !== "form") {
      return;
    }

    // 100ms to give all the form elements time to initialize.
    setTimeout(() => {
      const form = this.renderRoot.querySelector("ha-form");
      if (form) {
        (form as any).focus();
      }
    }, 100);
  }

  private _renderForm() {
    switch (this._state) {
      case "step":
        if (this._step == null) {
          return nothing;
        }
        return html`
          ${this._renderStep(this._step)}
          <div class="action">
            <mwc-button
              raised
              @click=${this._handleSubmit}
              .disabled=${this._submitting}
            >
              ${this._step.type === "form"
                ? this.localize("ui.panel.page-authorize.form.next")
                : this.localize("ui.panel.page-authorize.form.start_over")}
            </mwc-button>
          </div>
        `;
      case "error":
        return html`
          <ha-alert alert-type="error">
            ${this.localize(
              "ui.panel.page-authorize.form.error",
              "error",
              this._errorMessage
            )}
          </ha-alert>
          <div class="action">
            <mwc-button raised @click=${this._startOver}>
              ${this.localize("ui.panel.page-authorize.form.start_over")}
            </mwc-button>
          </div>
        `;
      case "loading":
        return html`
          <ha-alert alert-type="info">
            ${this.localize("ui.panel.page-authorize.form.working")}
          </ha-alert>
        `;
      default:
        return nothing;
    }
  }

  private _renderStep(step: DataEntryFlowStep) {
    switch (step.type) {
      case "abort":
        return html`
          ${this.localize("ui.panel.page-authorize.abort_intro")}:
          <ha-markdown
            allowsvg
            breaks
            .content=${this.localize(
              `ui.panel.page-authorize.form.providers.${step.handler[0]}.abort.${step.reason}`
            )}
          ></ha-markdown>
        `;
      case "form":
        return html`
          ${this._computeStepDescription(step)
            ? html`
                <ha-markdown
                  breaks
                  .content=${this._computeStepDescription(step)}
                ></ha-markdown>
              `
            : nothing}
          <ha-auth-form
            .data=${this._stepData}
            .schema=${autocompleteLoginFields(step.data_schema)}
            .error=${step.errors}
            .disabled=${this._submitting}
            .computeLabel=${this._computeLabelCallback(step)}
            .computeError=${this._computeErrorCallback(step)}
            @value-changed=${this._stepDataChanged}
          ></ha-auth-form>
          ${this.clientId === genClientId() &&
          !["select_mfa_module", "mfa"].includes(step.step_id)
            ? html`
                <ha-formfield
                  class="store-token"
                  .label=${this.localize("ui.panel.page-authorize.store_token")}
                >
                  <ha-checkbox
                    .checked=${this._storeToken}
                    @change=${this._storeTokenChanged}
                  ></ha-checkbox>
                </ha-formfield>
              `
            : ""}
        `;
      default:
        return nothing;
    }
  }

  private _storeTokenChanged(e: CustomEvent<HTMLInputElement>) {
    this._storeToken = (e.currentTarget as HTMLInputElement).checked;
  }

  private async _providerChanged(newProvider?: AuthProvider) {
    if (this._step && this._step.type === "form") {
      fetch(`/auth/login_flow/${this._step.flow_id}`, {
        method: "DELETE",
        credentials: "same-origin",
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Error delete obsoleted auth flow", err);
      });
    }

    if (newProvider == null) {
      // eslint-disable-next-line no-console
      console.error("No auth provider");
      this._state = "error";
      this._errorMessage = this._unknownError();
      return;
    }

    try {
      const response = await fetch("/auth/login_flow", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({
          client_id: this.clientId,
          handler: [newProvider.type, newProvider.id],
          redirect_uri: this.redirectUri,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // allow auth provider bypass the login form
        if (data.type === "create_entry") {
          this._redirect(data.result);
          return;
        }

        this._step = data;
        this._state = "step";
      } else {
        this._state = "error";
        this._errorMessage = data.message;
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error starting auth flow", err);
      this._state = "error";
      this._errorMessage = this._unknownError();
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
    if (this._storeToken) {
      url += `&storeToken=true`;
    }

    document.location.assign(url);
  }

  private _stepDataChanged(ev: CustomEvent) {
    this._stepData = ev.detail.value;
  }

  private _computeStepDescription(step: DataEntryFlowStepForm) {
    const resourceKey =
      `ui.panel.page-authorize.form.providers.${step.handler[0]}.step.${step.step_id}.description` as const;
    const args: string[] = [];
    const placeholders = step.description_placeholders || {};
    Object.keys(placeholders).forEach((key) => {
      args.push(key);
      args.push(placeholders[key]);
    });
    return this.localize(resourceKey, ...args);
  }

  private _computeLabelCallback(step: DataEntryFlowStepForm) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) =>
      this.localize(
        `ui.panel.page-authorize.form.providers.${step.handler[0]}.step.${step.step_id}.data.${schema.name}`
      );
  }

  private _computeErrorCallback(step: DataEntryFlowStepForm) {
    // Returns a callback for ha-form to calculate error messages
    return (error) =>
      this.localize(
        `ui.panel.page-authorize.form.providers.${step.handler[0]}.error.${error}`
      );
  }

  private _unknownError() {
    return this.localize("ui.panel.page-authorize.form.unknown_error");
  }

  private _startOver() {
    this._providerChanged(this.authProvider);
  }

  private async _handleSubmit(ev: Event) {
    ev.preventDefault();
    if (this._step == null) {
      return;
    }
    if (this._step.type !== "form") {
      this._providerChanged(this.authProvider);
      return;
    }
    this._submitting = true;

    const postData = { ...this._stepData, client_id: this.clientId };

    try {
      const response = await fetch(`/auth/login_flow/${this._step.flow_id}`, {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify(postData),
      });

      const newStep = await response.json();

      if (response.status === 403) {
        this._state = "error";
        this._errorMessage = newStep.message;
        return;
      }

      if (newStep.type === "create_entry") {
        this._redirect(newStep.result);
        return;
      }
      this._step = newStep;
      this._state = "step";
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error submitting step", err);
      this._state = "error";
      this._errorMessage = this._unknownError();
    } finally {
      this._submitting = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-auth-flow": HaAuthFlow;
  }
}
