import "../components/ha-card";
import "@material/mwc-button";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../types";
import "./hass-subpage";
import "../resources/ha-style";
import "../resources/roboto";
import { haStyle } from "../resources/styles";
import { applyThemesOnElement } from "../common/dom/apply_themes_on_element";
import { atLeastVersion } from "../common/config/version";

@customElement("supervisor-error-screen")
class SupervisorErrorScreen extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    this._applyTheme();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass) {
      return;
    }
    if (oldHass.themes !== this.hass.themes) {
      this._applyTheme();
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="toolbar">
        <ha-icon-button-arrow-prev
          .hass=${this.hass}
          @click=${this._handleBack}
        ></ha-icon-button-arrow-prev>
      </div>
      <div class="content">
        <div class="title">Could not load the Supervisor panel!</div>
        <ha-card header="Troubleshooting">
          <div class="card-content">
            <ol>
              <li>
                If you just started, make sure you have given the supervisor
                enough time to start.
              </li>
              <li>
                <a
                  class="supervisor_error-link"
                  href="http://homeassistant.local:4357"
                  target="_blank"
                  rel="noreferrer"
                >
                  Check the Observer
                </a>
              </li>
              <li>Try a reboot of the host</li>
              <li>
                <a href="/config/info" target="_parent">
                  Check System Health
                </a>
              </li>
              <li>
                <a
                  href="https://www.home-assistant.io/help/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ask for help
                </a>
              </li>
            </ol>
          </div>
        </ha-card>
      </div>
    `;
  }

  private _applyTheme() {
    let themeName: string;
    let options: Partial<HomeAssistant["selectedTheme"]> | undefined;

    if (atLeastVersion(this.hass.config.version, 0, 114)) {
      themeName =
        this.hass.selectedTheme?.theme ||
        (this.hass.themes.darkMode && this.hass.themes.default_dark_theme
          ? this.hass.themes.default_dark_theme!
          : this.hass.themes.default_theme);

      options = this.hass.selectedTheme;
      if (themeName === "default" && options?.dark === undefined) {
        options = {
          ...this.hass.selectedTheme,
          dark: this.hass.themes.darkMode,
        };
      }
    } else {
      themeName =
        ((this.hass.selectedTheme as unknown) as string) ||
        this.hass.themes.default_theme;
    }

    applyThemesOnElement(
      this.parentElement,
      this.hass.themes,
      themeName,
      options
    );
  }

  private _handleBack(): void {
    history.back();
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
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
