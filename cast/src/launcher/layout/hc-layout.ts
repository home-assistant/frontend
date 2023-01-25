import {
  Auth,
  Connection,
  getUser,
  HassUser,
} from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/ha-card";

@customElement("hc-layout")
class HcLayout extends LitElement {
  @property() public subtitle?: string | undefined;

  @property() public auth?: Auth;

  @property() public connection?: Connection;

  @property() public user?: HassUser;

  protected render(): TemplateResult {
    return html`
      <ha-card>
        <div class="layout">
          <img
            class="hero"
            alt="A Google Nest Hub with a Home Assistant dashboard on its screen"
            src="/images/google-nest-hub.png"
          />
          <h1 class="card-header">
            Home Assistant Cast${this.subtitle ? ` – ${this.subtitle}` : ""}
            ${this.auth
              ? html`
                  <div class="subtitle">
                    <a href=${this.auth.data.hassUrl} target="_blank"
                      >${this.auth.data.hassUrl.substr(
                        this.auth.data.hassUrl.indexOf("//") + 2
                      )}</a
                    >
                    ${this.user ? html` – ${this.user.name} ` : ""}
                  </div>
                `
              : ""}
          </h1>
          <slot></slot>
        </div>
      </ha-card>
      <div class="footer">
        <a href="./faq.html">Frequently Asked Questions</a> – Found a bug?
        <a
          href="https://github.com/home-assistant/frontend/issues"
          target="_blank"
          >Let us know!</a
        >
      </div>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (this.connection) {
      getUser(this.connection).then((user) => {
        this.user = user;
      });
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        min-height: 100%;
        align-items: center;
        justify-content: center;
        flex-direction: column;
      }

      ha-card {
        display: flex;
        width: 100%;
        max-width: 500px;
      }

      .layout {
        display: flex;
        flex-direction: column;
      }

      .card-header {
        color: var(--ha-card-header-color, --primary-text-color);
        font-family: var(--ha-card-header-font-family, inherit);
        font-size: var(--ha-card-header-font-size, 24px);
        letter-spacing: -0.012em;
        line-height: 32px;
        padding: 24px 16px 16px;
        display: block;
        margin: 0;
      }

      .hero {
        border-radius: 4px 4px 0 0;
      }
      .subtitle {
        font-size: 14px;
        color: var(--secondary-text-color);
        line-height: initial;
      }
      .subtitle a {
        color: var(--secondary-text-color);
      }

      :host ::slotted(.card-content:not(:first-child)),
      slot:not(:first-child)::slotted(.card-content) {
        padding-top: 0px;
        margin-top: -8px;
      }

      :host ::slotted(.section-header) {
        font-weight: 500;
        padding: 4px 16px;
        text-transform: uppercase;
      }

      :host ::slotted(.card-content) {
        padding: 16px;
        flex: 1;
      }

      :host ::slotted(.card-actions) {
        border-top: 1px solid #e8e8e8;
        padding: 5px 16px;
        display: flex;
      }

      img {
        width: 100%;
      }

      .footer {
        text-align: center;
        font-size: 12px;
        padding: 8px 0 24px;
        color: var(--secondary-text-color);
      }
      .footer a {
        color: var(--secondary-text-color);
      }

      @media all and (max-width: 500px) {
        :host {
          justify-content: flex-start;
          min-height: 90%;
          margin-bottom: 30px;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-layout": HcLayout;
  }
}
