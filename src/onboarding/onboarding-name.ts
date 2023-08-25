import "@material/mwc-button/mwc-button";
import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-alert";
import "../components/ha-formfield";
import "../components/ha-radio";
import "../components/ha-textfield";
import "../components/map/ha-locations-editor";
import { ConfigUpdateValues } from "../data/core";
import type { HomeAssistant } from "../types";

@customElement("onboarding-name")
class OnboardingName extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public onboardingLocalize!: LocalizeFunc;

  private _name?: ConfigUpdateValues["location_name"];

  protected render(): TemplateResult {
    return html`
      <p>
        ${this.onboardingLocalize(
          "ui.panel.page-onboarding.core-config.intro",
          { name: this.hass.user!.name }
        )}
      </p>

      <ha-textfield
        .label=${this.onboardingLocalize(
          "ui.panel.page-onboarding.core-config.location_name"
        )}
        .value=${this._nameValue}
        @change=${this._nameChanged}
      ></ha-textfield>

      <p>
        ${this.onboardingLocalize(
          "ui.panel.page-onboarding.core-config.intro_core"
        )}
      </p>

      <div class="footer">
        <mwc-button @click=${this._save} .disabled=${!this._nameValue}>
          ${this.onboardingLocalize(
            "ui.panel.page-onboarding.core-config.finish"
          )}
        </mwc-button>
      </div>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    setTimeout(
      () => this.renderRoot.querySelector("ha-textfield")!.focus(),
      100
    );
    this.addEventListener("keyup", (ev) => {
      if (ev.key === "Enter") {
        this._save(ev);
      }
    });
  }

  private get _nameValue() {
    return this._name !== undefined
      ? this._name
      : this.onboardingLocalize(
          "ui.panel.page-onboarding.core-config.location_name_default"
        );
  }

  private _nameChanged(ev) {
    this._name = ev.target.value;
  }

  private async _save(ev) {
    ev.preventDefault();
    fireEvent(this, "value-changed", {
      value: this._nameValue,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-textfield {
        display: block;
      }
      p {
        font-size: 14px;
        line-height: 20px;
      }
      .footer {
        margin-top: 16px;
        text-align: right;
      }
      a {
        color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-name": OnboardingName;
  }
}
