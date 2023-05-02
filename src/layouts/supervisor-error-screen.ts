import "@material/mwc-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { atLeastVersion } from "../common/config/version";
import { applyThemesOnElement } from "../common/dom/apply_themes_on_element";
import "../components/ha-card";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";
import "./hass-subpage";

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
      <hass-subpage
        .hass=${this.hass}
        .header=${this.hass.localize("ui.errors.supervisor.title")}
      >
        <ha-card header="Troubleshooting">
          <div class="card-content">
            <ol>
              <li>${this.hass.localize("ui.errors.supervisor.wait")}</li>
              <li>
                <a
                  class="supervisor_error-link"
                  href="http://homeassistant.local:4357"
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.hass.localize("ui.errors.supervisor.observer")}
                </a>
              </li>
              <li>${this.hass.localize("ui.errors.supervisor.reboot")}</li>
              <li>
                <a href="/config/info" target="_parent">
                  ${this.hass.localize("ui.errors.supervisor.system_health")}
                </a>
              </li>
              <li>
                <a
                  href="https://www.home-assistant.io/help/"
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.hass.localize("ui.errors.supervisor.ask")}
                </a>
              </li>
            </ol>
          </div>
        </ha-card>
      </hass-subpage>
    `;
  }

  private _applyTheme() {
    let themeName: string;
    let themeSettings: Partial<HomeAssistant["selectedTheme"]> | undefined;

    if (atLeastVersion(this.hass.config.version, 0, 114)) {
      themeName =
        this.hass.selectedTheme?.theme ||
        (this.hass.themes.darkMode && this.hass.themes.default_dark_theme
          ? this.hass.themes.default_dark_theme!
          : this.hass.themes.default_theme);

      themeSettings = this.hass.selectedTheme;
    } else {
      themeName =
        (this.hass.selectedTheme as unknown as string) ||
        this.hass.themes.default_theme;
    }

    applyThemesOnElement(
      this.parentElement,
      this.hass.themes,
      themeName,
      themeSettings,
      true
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        a {
          color: var(--mdc-theme-primary);
        }

        ha-card {
          width: 600px;
          margin: auto;
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
