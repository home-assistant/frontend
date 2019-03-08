import "@polymer/paper-input/paper-input";
import "@material/mwc-button";
import {
  LitElement,
  CSSResult,
  css,
  html,
  PropertyValues,
  property,
  customElement,
  TemplateResult,
} from "lit-element";
import { genClientId } from "home-assistant-js-websocket";
import { litLocalizeLiteMixin } from "../mixins/lit-localize-lite-mixin";
import { OnboardingStep, onboardUserStep } from "../data/onboarding";
import { PolymerChangedEvent } from "../polymer-types";

@customElement("ha-onboarding")
class HaOnboarding extends litLocalizeLiteMixin(LitElement) {
  public translationFragment = "page-onboarding";

  @property() private _name = "";
  @property() private _username = "";
  @property() private _password = "";
  @property() private _loading = false;
  @property() private _errorMsg?: string = undefined;

  protected render(): TemplateResult | void {
    return html`
    <p>
      ${this.localize("ui.panel.page-onboarding.intro")}
    </p>

    <p>
      ${this.localize("ui.panel.page-onboarding.user.intro")}
    </p>

    ${
      this._errorMsg
        ? html`
            <p class="error">
              ${this.localize(
                `ui.panel.page-onboarding.user.error.${this._errorMsg}`
              ) || this._errorMsg}
            </p>
          `
        : ""
    }


    <form>
      <paper-input
        autofocus
        name="name"
        label="${this.localize("ui.panel.page-onboarding.user.data.name")}"
        .value=${this._name}
        @value-changed=${this._handleValueChanged}
        required
        auto-validate
        autocapitalize='on'
        .errorMessage="${this.localize(
          "ui.panel.page-onboarding.user.required_field"
        )}"
        @blur=${this._maybePopulateUsername}
      ></paper-input>

      <paper-input
        name="username"
        label="${this.localize("ui.panel.page-onboarding.user.data.username")}"
        value=${this._username}
        @value-changed=${this._handleValueChanged}
        required
        auto-validate
        autocapitalize='none'
        .errorMessage="${this.localize(
          "ui.panel.page-onboarding.user.required_field"
        )}"
      ></paper-input>

      <paper-input
        name="password"
        label="${this.localize("ui.panel.page-onboarding.user.data.password")}"
        value=${this._password}
        @value-changed=${this._handleValueChanged}
        required
        type='password'
        auto-validate
        .errorMessage="${this.localize(
          "ui.panel.page-onboarding.user.required_field"
        )}"
      ></paper-input>

      <p class="action">
        <mwc-button raised @click="_submitForm" .disabled=${this._loading}>
          ${this.localize("ui.panel.page-onboarding.user.create_account")}
        </mwc-button>
      </p>
    </div>
  </form>
`;
  }

  protected async firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("keypress", (ev) => {
      if (ev.keyCode === 13) {
        this._submitForm();
      }
    });

    try {
      const response = await window.stepsPromise;

      if (response.status === 404) {
        // We don't load the component when onboarding is done
        document.location.href = "/";
        return;
      }

      const steps: OnboardingStep[] = await response.json();

      if (steps.every((step) => step.done)) {
        // Onboarding is done!
        document.location.href = "/";
      }
    } catch (err) {
      alert("Something went wrong loading loading onboarding, try refreshing");
    }
  }

  private _handleValueChanged(ev: PolymerChangedEvent<string>) {
    const name = (ev.target as any).name;
    this[`_${name}`] = ev.detail.value;
  }

  private _maybePopulateUsername() {
    if (this._username) {
      return;
    }

    const parts = this._name.split(" ");

    if (parts.length) {
      this._username = parts[0].toLowerCase();
    }
  }

  private async _submitForm() {
    if (!this._name || !this._username || !this._password) {
      this._errorMsg = "required_fields";
      return;
    }

    this._loading = true;
    this._errorMsg = "";

    try {
      const clientId = genClientId();

      const { auth_code } = await onboardUserStep({
        client_id: clientId,
        name: this._name,
        username: this._username,
        password: this._password,
      });

      const state = btoa(
        JSON.stringify({
          hassUrl: `${location.protocol}//${location.host}`,
          clientId,
        })
      );

      document.location.href = `/?auth_callback=1&code=${encodeURIComponent(
        auth_code
      )}&state=${state}`;
    } catch (err) {
      // tslint:disable-next-line
      console.error(err);
      this._loading = false;
      this._errorMsg = err.message;
    }
  }

  static get styles(): CSSResult {
    return css`
      .error {
        color: red;
      }

      .action {
        margin: 32px 0;
        text-align: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-onboarding": HaOnboarding;
  }
}
