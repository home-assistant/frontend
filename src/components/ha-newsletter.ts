import "./ha-circular-progress";
import "@material/mwc-button/mwc-button";
import "./ha-card";
import "./ha-textfield";
import { LitElement, TemplateResult, html, CSSResultGroup, css } from "lit";
import { customElement, property, query } from "lit/decorators";
import type { HaTextField } from "./ha-textfield";
import { HomeAssistant } from "../types";

@customElement("ha-newsletter")
class HaNewsletter extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  @query("ha-textfield")
  private _emailField?: HaTextField;

  private _requestStatus?: "inprogress" | "complete";

  protected render(): TemplateResult {
    return html`
      <ha-card .header=${this.hass.localize("ui.newsletter.newsletter")}>
        <div class="newsletter">
          ${this._requestStatus === "complete"
            ? html`<span>${this.hass.localize("ui.newsletter.thanks")}</span>`
            : html`
                <ha-textfield
                  .label=${this.hass.localize("ui.newsletter.email")}
                  type="email"
                  required
                  .validationMessage=${this.hass.localize(
                    "ui.newsletter.validation"
                  )}
                ></ha-textfield>
                ${this._requestStatus === "inprogress"
                  ? html`
                      <ha-circular-progress
                        active
                        alt="Loading"
                      ></ha-circular-progress>
                    `
                  : html`
                      <mwc-button
                        raised
                        .label=${this.hass.localize("ui.newsletter.subscribe")}
                        @click=${this._subscribe}
                      ></mwc-button>
                    `}
              `}
        </div>
      </ha-card>
    `;
  }

  private async _subscribe() {
    if (!this._emailField?.reportValidity()) {
      this._emailField!.focus();
      return;
    }

    this._requestStatus = "inprogress";

    await fetch(
      `https://newsletter.home-assistant.io/subscribe?email=${
        this._emailField!.value
      }`
    )
      .then(() => {
        this._requestStatus = "complete";
      })
      .catch((err) => {
        this._requestStatus = undefined;
        // eslint-disable-next-line no-console
        console.error(err);
      });
  }

  static get styles(): CSSResultGroup {
    return css`
      .newsletter {
        display: flex;
        flex-direction: row;
        padding: 0 16px 16px;
      }

      ha-textfield {
        flex: 1;
        display: block;
        padding-right: 8px;
      }

      mwc-button {
        padding-top: 12px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-newsletter": HaNewsletter;
  }
}
