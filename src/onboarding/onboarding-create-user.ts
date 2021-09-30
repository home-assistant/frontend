import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import { genClientId } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { LocalizeFunc } from "../common/translations/localize";
import { onboardUserStep } from "../data/onboarding";
import { PolymerChangedEvent } from "../polymer-types";

@customElement("onboarding-create-user")
class OnboardingCreateUser extends LitElement {
  @property() public localize!: LocalizeFunc;

  @property() public language!: string;

  @state() private _name = "";

  @state() private _username = "";

  @state() private _password = "";

  @state() private _passwordConfirm = "";

  @state() private _loading = false;

  @state() private _errorMsg?: string = undefined;

  protected render(): TemplateResult {
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
        name="name"
        label=${this.localize("ui.panel.page-onboarding.user.data.name")}
        .value=${this._name}
        @value-changed=${this._handleValueChanged}
        required
        auto-validate
        autocapitalize='on'
        .errorMessage=${this.localize(
          "ui.panel.page-onboarding.user.required_field"
        )}
        @blur=${this._maybePopulateUsername}
      ></paper-input>

      <paper-input
        name="username"
        label=${this.localize("ui.panel.page-onboarding.user.data.username")}
        value=${this._username}
        @value-changed=${this._handleValueChanged}
        required
        auto-validate
        autocapitalize='none'
        .errorMessage=${this.localize(
          "ui.panel.page-onboarding.user.required_field"
        )}
      ></paper-input>

      <paper-input
        name="password"
        label=${this.localize("ui.panel.page-onboarding.user.data.password")}
        value=${this._password}
        @value-changed=${this._handleValueChanged}
        required
        type='password'
        auto-validate
        .errorMessage=${this.localize(
          "ui.panel.page-onboarding.user.required_field"
        )}
      ></paper-input>

      <paper-input
        name="passwordConfirm"
        label=${this.localize(
          "ui.panel.page-onboarding.user.data.password_confirm"
        )}
        value=${this._passwordConfirm}
        @value-changed=${this._handleValueChanged}
        required
        type='password'
        .invalid=${
          this._password !== "" &&
          this._passwordConfirm !== "" &&
          this._passwordConfirm !== this._password
        }
        .errorMessage=${this.localize(
          "ui.panel.page-onboarding.user.error.password_not_match"
        )}
      ></paper-input>

      <p class="action">
        <mwc-button
          raised
          @click=${this._submitForm}
          .disabled=${this._loading}
        >
          ${this.localize("ui.panel.page-onboarding.user.create_account")}
        </mwc-button>
      </p>
    </div>
  </form>
`;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    setTimeout(
      () => this.shadowRoot!.querySelector("paper-input")!.focus(),
      100
    );
    this.addEventListener("keypress", (ev) => {
      if (ev.keyCode === 13) {
        this._submitForm(ev);
      }
    });
  }

  private _handleValueChanged(ev: PolymerChangedEvent<string>): void {
    const name = (ev.target as any).name;
    this[`_${name}`] = ev.detail.value;
  }

  private _maybePopulateUsername(): void {
    if (this._username) {
      return;
    }

    const parts = this._name.split(" ");

    if (parts.length) {
      this._username = parts[0].toLowerCase();
    }
  }

  private async _submitForm(ev): Promise<void> {
    ev.preventDefault();
    if (!this._name || !this._username || !this._password) {
      this._errorMsg = "required_fields";
      return;
    }

    if (this._password !== this._passwordConfirm) {
      this._errorMsg = "password_not_match";
      return;
    }

    this._loading = true;
    this._errorMsg = "";

    try {
      const clientId = genClientId();

      const result = await onboardUserStep({
        client_id: clientId,
        name: this._name,
        username: this._username,
        password: this._password,
        language: this.language,
      });

      fireEvent(this, "onboarding-step", {
        type: "user",
        result,
      });
    } catch (err: any) {
      // eslint-disable-next-line
      console.error(err);
      this._loading = false;
      this._errorMsg = err.body.message;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .error {
        color: red;
      }

      .action {
        margin: 32px 0 16px;
        text-align: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-create-user": OnboardingCreateUser;
  }
}
