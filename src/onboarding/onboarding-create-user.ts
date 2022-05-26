import "@material/mwc-button";
import { genClientId } from "home-assistant-js-websocket";
import {
  css,
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
import { PolymerChangedEvent } from "../polymer-types";

const CREATE_USER_SCHEMA: HaFormSchema[] = [
  { name: "name", required: true, selector: { text: {} } },
  { name: "username", required: true, selector: { text: {} } },
  {
    name: "password",
    required: true,
    selector: { text: { type: "password" } },
  },
  {
    name: "password_confirm",
    required: true,
    selector: { text: { type: "password" } },
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
      <p>${this.localize("ui.panel.page-onboarding.intro")}</p>
      <p>${this.localize("ui.panel.page-onboarding.user.intro")}</p>

      ${this._errorMsg
        ? html`<ha-alert alert-type="error">${this._errorMsg}</ha-alert>`
        : ""}

      <ha-form
        .computeLabel=${this._computeLabel(this.localize)}
        .data=${this._newUser}
        .disabled=${this._loading}
        .error=${this._formError}
        .schema=${CREATE_USER_SCHEMA}
        @value-changed=${this._handleValueChanged}
      ></ha-form>

      <mwc-button
        raised
        @click=${this._submitForm}
        .disabled=${this._loading ||
        !this._newUser.name ||
        !this._newUser.username ||
        !this._newUser.password}
      >
        ${this.localize("ui.panel.page-onboarding.user.create_account")}
      </mwc-button>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    setTimeout(() => this._form?.focus(), 100);
    this.addEventListener("keypress", (ev) => {
      if (
        ev.keyCode === 13 &&
        this._newUser.name &&
        this._newUser.username &&
        this._newUser.password &&
        this._newUser.password_confirm
      ) {
        this._submitForm(ev);
      }
    });
  }

  private _computeLabel(localize) {
    return (schema: HaFormSchema) =>
      localize(`ui.panel.page-onboarding.user.data.${schema.name}`);
  }

  private _handleValueChanged(
    ev: PolymerChangedEvent<HaFormDataContainer>
  ): void {
    const nameChanged = ev.detail.value.name !== this._newUser.name;
    this._newUser = ev.detail.value;
    if (nameChanged) {
      this._maybePopulateUsername();
    }
    this._formError.password_confirm =
      this._newUser.password !== this._newUser.password_confirm
        ? this.localize(
            "ui.panel.page-onboarding.user.error.password_not_match"
          )
        : "";
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
    return css`
      mwc-button {
        margin: 32px 0 0;
        text-align: center;
        display: block;
        text-align: right;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-create-user": OnboardingCreateUser;
  }
}
