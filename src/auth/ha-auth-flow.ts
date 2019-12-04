import {
  LitElement,
  html,
  property,
  PropertyValues,
  CSSResult,
  css,
} from "lit-element";
import "@material/mwc-button";
import "../components/ha-form/ha-form";
import "../components/ha-markdown";
import { litLocalizeLiteMixin } from "../mixins/lit-localize-lite-mixin";
import { AuthProvider } from "../data/auth";
import {
  DataEntryFlowStep,
  DataEntryFlowStepForm,
} from "../data/data_entry_flow";

type State = "loading" | "error" | "step";

class HaAuthFlow extends litLocalizeLiteMixin(LitElement) {
  @property() public authProvider?: AuthProvider;
  @property() public clientId?: string;
  @property() public redirectUri?: string;
  @property() public oauth2State?: string;
  @property() private _state: State = "loading";
  @property() private _stepData: any = {};
  @property() private _step?: DataEntryFlowStep;
  @property() private _errorMessage?: string;

  protected render() {
    return html`
      <form>
        ${this._renderForm()}
      </form>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    if (this.clientId == null || this.redirectUri == null) {
      // tslint:disable-next-line: no-console
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
      if (ev.keyCode === 13) {
        this._handleSubmit(ev);
      }
    });
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("authProvider")) {
      this._providerChanged(this.authProvider);
    }
  }

  private _renderForm() {
    switch (this._state) {
      case "step":
        if (this._step == null) {
          return html``;
        }
        return html`
          ${this._renderStep(this._step)}
          <div class="action">
            <mwc-button raised @click=${this._handleSubmit}
              >${this._step.type === "form" ? "Next" : "Start over"}</mwc-button
            >
          </div>
        `;
      case "error":
        return html`
          <div class="error">Error: ${this._errorMessage}</div>
        `;
      case "loading":
        return html`
          ${this.localize("ui.panel.page-authorize.form.working")}
        `;
    }
  }

  private _renderStep(step: DataEntryFlowStep) {
    switch (step.type) {
      case "abort":
        return html`
          ${this.localize("ui.panel.page-authorize.abort_intro")}:
          <ha-markdown
            allowsvg
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
                  .content=${this._computeStepDescription(step)}
                ></ha-markdown>
              `
            : html``}
          <ha-form
            .data=${this._stepData}
            .schema=${step.data_schema}
            .error=${step.errors}
            .computeLabel=${this._computeLabelCallback(step)}
            .computeError=${this._computeErrorCallback(step)}
            @value-changed=${this._stepDataChanged}
          ></ha-form>
        `;
      default:
        return html``;
    }
  }

  private async _providerChanged(newProvider?: AuthProvider) {
    if (this._step && this._step.type === "form") {
      fetch(`/auth/login_flow/${this._step.flow_id}`, {
        method: "DELETE",
        credentials: "same-origin",
      }).catch((err) => {
        // tslint:disable-next-line: no-console
        console.error("Error delete obsoleted auth flow", err);
      });
    }

    if (newProvider == null) {
      // tslint:disable-next-line: no-console
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

        await this._updateStep(data);
      } else {
        this._state = "error";
        this._errorMessage = data.message;
      }
    } catch (err) {
      // tslint:disable-next-line: no-console
      console.error("Error starting auth flow", err);
      this._state = "error";
      this._errorMessage = this._unknownError();
    }
  }

  private _redirect(authCode: string) {
    // OAuth 2: 3.1.2 we need to retain query component of a redirect URI
    let url = this.redirectUri!!;
    if (!url.includes("?")) {
      url += "?";
    } else if (!url.endsWith("&")) {
      url += "&";
    }

    url += `code=${encodeURIComponent(authCode)}`;

    if (this.oauth2State) {
      url += `&state=${encodeURIComponent(this.oauth2State)}`;
    }

    document.location.assign(url);
  }

  private async _updateStep(step: DataEntryFlowStep) {
    let stepData: any = null;
    if (
      this._step &&
      (step.flow_id !== this._step.flow_id ||
        (step.type === "form" &&
          this._step.type === "form" &&
          step.step_id !== this._step.step_id))
    ) {
      stepData = {};
    }
    this._step = step;
    this._state = "step";
    if (stepData != null) {
      this._stepData = stepData;
    }

    await this.updateComplete;
    // 100ms to give all the form elements time to initialize.
    setTimeout(() => {
      const form = this.shadowRoot!.querySelector("ha-form");
      if (form) {
        (form as any).focus();
      }
    }, 100);
  }

  private _stepDataChanged(ev: CustomEvent) {
    this._stepData = ev.detail.value;
  }

  private _computeStepDescription(step: DataEntryFlowStepForm) {
    const resourceKey = `ui.panel.page-authorize.form.providers.${step.handler[0]}.step.${step.step_id}.description`;
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

  private async _handleSubmit(ev: Event) {
    ev.preventDefault();
    if (this._step == null) {
      return;
    }
    if (this._step.type !== "form") {
      this._providerChanged(this.authProvider);
      return;
    }
    this._state = "loading";
    // To avoid a jumping UI.
    this.style.setProperty("min-height", `${this.offsetHeight}px`);

    const postData = { ...this._stepData, client_id: this.clientId };

    try {
      const response = await fetch(`/auth/login_flow/${this._step.flow_id}`, {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify(postData),
      });

      const newStep = await response.json();

      if (newStep.type === "create_entry") {
        this._redirect(newStep.result);
        return;
      }
      await this._updateStep(newStep);
    } catch (err) {
      // tslint:disable-next-line: no-console
      console.error("Error submitting step", err);
      this._state = "error";
      this._errorMessage = this._unknownError();
    } finally {
      this.style.setProperty("min-height", "");
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        /* So we can set min-height to avoid jumping during loading */
        display: block;
      }
      .action {
        margin: 24px 0 8px;
        text-align: center;
      }
      .error {
        color: red;
      }
    `;
  }
}
customElements.define("ha-auth-flow", HaAuthFlow);
