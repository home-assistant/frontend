import "./ha-icon-button";
import "./ha-circular-progress";
import "@material/mwc-button/mwc-button";
import "./ha-card";
import "./ha-textfield";
import { LitElement, TemplateResult, html, CSSResultGroup, css } from "lit";
import { customElement, property, query } from "lit/decorators";
import { mdiClose } from "@mdi/js";
import type { HaTextField } from "./ha-textfield";
import type { HomeAssistant } from "../types";
import { LocalStorage } from "../common/decorators/local-storage";

@customElement("ha-newsletter")
class HaNewsletter extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  @query("ha-textfield")
  private _emailField?: HaTextField;

  @LocalStorage("dismissNewsletter", true)
  private _dismissNewsletter = false;

  private _requestStatus?: "inprogress" | "complete";

  protected render(): TemplateResult {
    if (this._dismissNewsletter) {
      return html``;
    }

    return html`
      <ha-card>
        <div class="header">
          ${this.hass.localize("ui.newsletter.newsletter")}
          <ha-icon-button
            label="Dismiss"
            .path=${mdiClose}
            @click=${this._dismiss}
          ></ha-icon-button>
        </div>
        <div class="newsletter">
          ${this._requestStatus === "complete"
            ? html`<span>${this.hass.localize("ui.newsletter.thanks")}</span>`
            : html`
                <ha-textfield
                  required
                  type="email"
                  .label=${this.hass.localize("ui.newsletter.email")}
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

  private _subscribe(): void {
    if (!this._emailField?.reportValidity()) {
      this._emailField!.focus();
      return;
    }

    this._requestStatus = "inprogress";

    fetch(
      `https://newsletter.home-assistant.io/subscribe?email=${
        this._emailField!.value
      }`
    )
      .then(() => {
        this._requestStatus = "complete";
        setTimeout(this._dismiss, 2000);
      })
      .catch((err) => {
        // Reset request so user can re-enter email
        this._requestStatus = undefined;
        // eslint-disable-next-line no-console
        console.error(err);
      });
  }

  private _dismiss(): void {
    this._dismissNewsletter = true;
  }

  static get styles(): CSSResultGroup {
    return css`
      .newsletter {
        display: flex;
        flex-direction: row;
        padding: 0 16px 16px;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--ha-card-header-color, --primary-text-color);
        font-family: var(--ha-card-header-font-family, inherit);
        font-size: var(--ha-card-header-font-size, 24px);
        letter-spacing: -0.012em;
        line-height: 48px;
        padding: 12px 16px 16px;
        margin-block-start: 0px;
        margin-block-end: 0px;
        font-weight: normal;
      }

      ha-textfield {
        flex: 1;
        display: block;
        padding-right: 8px;
      }

      mwc-button {
        padding-top: 12px;
      }

      ha-icon-button {
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-newsletter": HaNewsletter;
  }
}
