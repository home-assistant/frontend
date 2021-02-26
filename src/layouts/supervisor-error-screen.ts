import "../components/ha-card";
import "@material/mwc-button";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../types";
import "./hass-subpage";

@customElement("supervisor-error-screen")
class SupervisorErrorScreen extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public toolbar = true;

  protected render(): TemplateResult {
    return html`
      ${this.toolbar
        ? html`<div class="toolbar">
            <ha-icon-button-arrow-prev
              .hass=${this.hass}
              @click=${this._handleBack}
            ></ha-icon-button-arrow-prev>
          </div>`
        : ""}
      <div class="content">
        <div class="title">Could not load the Supervisor panel!</div>
        <ha-card header="Troubleshooting">
          <div class="card-content">
            <ol>
              <li>
                If you just started, make sure you have given the supervisor
                enough time to start.
              </li>
              <li>Check the observer</li>
              <li>Try a reboot of the host</li>
            </ol>
          </div>
        </ha-card>
        <ha-card header="Links">
          <div class="card-content">
            <ol>
              <li>
                <a
                  class="supervisor_error-link"
                  href="http://homeassistant.local:4357"
                  target="_blank"
                  rel="noreferrer"
                >
                  Observer
                </a>
              </li>
              <li>
                <a href="/config/info" target="_parent">
                  System Health
                </a>
              </li>
              <li>
                <a
                  href="https://www.home-assistant.io/help/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Need help?
                </a>
              </li>
            </ol>
          </div>
        </ha-card>
      </div>
    `;
  }

  private _handleBack(): void {
    history.back();
  }

  static get styles(): CSSResultArray {
    return [
      css`
        .toolbar {
          display: flex;
          align-items: center;
          font-size: 20px;
          height: var(--header-height);
          padding: 0 16px;
          pointer-events: none;
          background-color: var(--app-header-background-color);
          font-weight: 400;
          box-sizing: border-box;
        }
        ha-icon-button-arrow-prev {
          pointer-events: auto;
        }
        .content {
          color: var(--primary-text-color);
          display: flex;
          padding: 16px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }
        .title {
          font-size: 24px;
          font-weight: 400;
          line-height: 32px;
          padding-bottom: 16px;
        }

        a {
          color: var(--mdc-theme-primary);
        }

        ha-card {
          width: 600px;
          margin: 16px;
          padding: 8px;
        }
        @media all and (max-width: 500px) {
          ha-card {
            width: calc(100vw - 32px);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-error-screen": SupervisorErrorScreen;
  }
}
