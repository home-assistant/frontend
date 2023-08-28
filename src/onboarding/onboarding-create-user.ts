import "@material/mwc-button";
import { genClientId } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-form/ha-form";
import type { HaForm } from "../components/ha-form/ha-form";
import { HaFormDataContainer, HaFormSchema } from "../components/ha-form/types";
import { onboardUserStep } from "../data/onboarding";
import { ValueChangedEvent } from "../types";
import { onBoardingStyles } from "./styles";
import { debounce } from "../common/util/debounce";

const CREATE_USER_SCHEMA: HaFormSchema[] = [
  {
    name: "name",
    required: true,
    selector: { text: { autocomplete: "name" } },
  },
  {
    name: "username",
    required: true,
    selector: { text: { autocomplete: "username" } },
  },
  {
    name: "password",
    required: true,
    selector: { text: { type: "password", autocomplete: "new-password" } },
  },
  {
    name: "password_confirm",
    required: true,
    selector: { text: { type: "password", autocomplete: "new-password" } },
  },
];

@customElement("onboarding-create-user")
class OnboardingCreateUser extends LitElement {
  @property() public localize!: LocalizeFunc;

  @property() public language!: string;

  @state() private _loading = false;

  @state() private _errorMsg?: string;

  @state() private _formError: Record<string, string> = {};

  @state() private _newUser: HaFormDataContainer = {};

  @query("ha-form", true) private _form?: HaForm;

  protected render(): TemplateResult {
    return html`
      <h1>${this.localize("ui.panel.page-onboarding.user.header")}</h1>
      <p>${this.localize("ui.panel.page-onboarding.user.intro")}</p>

      ${this._errorMsg
        ? html`<ha-alert alert-type="error">${this._errorMsg}</ha-alert>`
        : ""}

      <ha-form
        .computeLabel=${this._computeLabel(this.localize)}
        .computeHelper=${this._computeHelper(this.localize)}
        .data=${this._newUser}
        .disabled=${this._loading}
        .error=${this._formError}
        .schema=${CREATE_USER_SCHEMA}
        @value-changed=${this._handleValueChanged}
      ></ha-form>
      <div class="footer">
        <mwc-button
          unelevated
          @click=${this._submitForm}
          .disabled=${this._loading ||
          !this._newUser.name ||
          !this._newUser.username ||
          !this._newUser.password ||
          !this._newUser.password_confirm ||
          this._newUser.password !== this._newUser.password_confirm}
        >
          ${this.localize("ui.panel.page-onboarding.user.create_account")}
        </mwc-button>
      </div>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    setTimeout(() => this._form?.focus(), 100);
    this.addEventListener("keypress", (ev) => {
      if (
        ev.key === "Enter" &&
        this._newUser.name &&
        this._newUser.username &&
        this._newUser.password &&
        this._newUser.password_confirm &&
        this._newUser.password === this._newUser.password_confirm
      ) {
        this._submitForm(ev);
      }
    });
  }

  private _computeLabel(localize) {
    return (schema: HaFormSchema) =>
      localize(`ui.panel.page-onboarding.user.data.${schema.name}`);
  }

  private _computeHelper(localize) {
    return (schema: HaFormSchema) =>
      localize(`ui.panel.page-onboarding.user.helper.${schema.name}`);
  }

  private _handleValueChanged(
    ev: ValueChangedEvent<HaFormDataContainer>
  ): void {
    const nameChanged = ev.detail.value.name !== this._newUser.name;
    const passwordChanged =
      ev.detail.value.password !== this._newUser.password ||
      ev.detail.value.password_confirm !== this._newUser.password_confirm;
    this._newUser = ev.detail.value;
    if (nameChanged) {
      this._maybePopulateUsername();
    }
    if (passwordChanged) {
      if (this._formError.password_confirm) {
        this._checkPasswordMatch();
      } else {
        this._debouncedCheckPasswordMatch();
      }
    }
  }

  private _debouncedCheckPasswordMatch = debounce(
    () => this._checkPasswordMatch(),
    500
  );

  private _checkPasswordMatch(): void {
    const old = this._formError.password_confirm;
    this._formError.password_confirm =
      this._newUser.password_confirm &&
      this._newUser.password !== this._newUser.password_confirm
        ? this.localize(
            "ui.panel.page-onboarding.user.error.password_not_match"
          )
        : "";
    if (old !== this._formError.password_confirm) {
      this.requestUpdate("_formError");
    }
  }

  private _maybePopulateUsername(): void {
    if (!this._newUser.name || this._newUser.name === this._newUser.username) {
      return;
    }

    const parts = String(this._newUser.name).split(" ");
    if (parts.length) {
      this._newUser.username = parts[0].toLowerCase();
    }
  }

  private async _submitForm(ev): Promise<void> {
    ev.preventDefault();
    this._loading = true;
    this._errorMsg = "";

    try {
      const clientId = genClientId();

      const result = await onboardUserStep({
        client_id: clientId,
        name: String(this._newUser.name),
        username: String(this._newUser.username),
        password: String(this._newUser.password),
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
    return onBoardingStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-create-user": OnboardingCreateUser;
  }
}
