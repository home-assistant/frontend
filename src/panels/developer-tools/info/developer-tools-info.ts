import {
  LitElement,
  html,
  CSSResult,
  css,
  TemplateResult,
  property,
} from "lit-element";

import { HomeAssistant } from "../../../types";
import { haStyle } from "../../../resources/styles";

import "./system-health-card";
import "./integrations-card";

const JS_TYPE = __BUILD__;
const JS_VERSION = __VERSION__;

class HaPanelDevInfo extends LitElement {
  @property() public hass!: HomeAssistant;

  protected render(): TemplateResult {
    const hass = this.hass;
    const customUiList: Array<{ name: string; url: string; version: string }> =
      (window as any).CUSTOM_UI_LIST || [];

    return html`
      <div class="about">
        <p class="version">
          <a href="https://www.home-assistant.io" target="_blank" rel="noreferrer"
            ><img
              src="/static/icons/favicon-192x192.png"
              height="192"
              alt="${this.hass.localize(
                "ui.panel.developer-tools.tabs.info.home_assistant_logo"
              )}"
          /></a>
          <br />
          <h2>Home Assistant ${hass.config.version}</h2>
        </p>
        <p>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.info.path_configuration",
            "path",
            hass.config.config_dir
          )}
        </p>
        <p class="develop">
          <a
            href="https://www.home-assistant.io/developers/credits/"
            target="_blank" rel="noreferrer"
          >
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.info.developed_by"
            )}
          </a>
        </p>
        <p>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.info.license"
          )}<br />
          ${this.hass.localize("ui.panel.developer-tools.tabs.info.source")}
          <a
            href="https://github.com/home-assistant/home-assistant"
            target="_blank" rel="noreferrer"
            >${this.hass.localize(
              "ui.panel.developer-tools.tabs.info.server"
            )}</a
          >
          &mdash;
          <a
            href="https://github.com/home-assistant/home-assistant-polymer"
            target="_blank" rel="noreferrer"
            >${this.hass.localize(
              "ui.panel.developer-tools.tabs.info.frontend"
            )}</a
          >
        </p>
        <p>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.info.built_using"
          )}
          <a href="https://www.python.org" target="_blank" rel="noreferrer">Python 3</a>,
          <a href="https://www.polymer-project.org" target="_blank" rel="noreferrer">Polymer</a>,
          ${this.hass.localize("ui.panel.developer-tools.tabs.info.icons_by")}
          <a href="https://www.google.com/design/icons/" target="_blank" rel="noreferrer"
            >Google</a
          >
          and
          <a href="https://MaterialDesignIcons.com" target="_blank" rel="noreferrer"
            >MaterialDesignIcons.com</a
          >.
        </p>
        <p>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.info.frontend_version",
            "version",
            JS_VERSION,
            "type",
            JS_TYPE
          )}
          ${
            customUiList.length > 0
              ? html`
                  <div>
                    ${this.hass.localize(
                      "ui.panel.developer-tools.tabs.info.custom_uis"
                    )}
                    ${customUiList.map(
                      (item) => html`
                        <div>
                          <a href="${item.url}" target="_blank"> ${item.name}</a
                          >: ${item.version}
                        </div>
                      `
                    )}
                  </div>
                `
              : ""
          }
        </p>
      </div>
      <div class="content">
        <system-health-card .hass=${this.hass}></system-health-card>
        <integrations-card .hass=${this.hass}></integrations-card>
      </div>
    `;
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);

    // Legacy custom UI can be slow to register, give them time.
    const customUI = ((window as any).CUSTOM_UI_LIST || []).length;
    setTimeout(() => {
      if (((window as any).CUSTOM_UI_LIST || []).length !== customUI.length) {
        this.requestUpdate();
      }
    }, 1000);
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }

        .content {
          direction: ltr;
        }

        .about {
          text-align: center;
          line-height: 2em;
        }

        .version {
          @apply --paper-font-headline;
        }

        .develop {
          @apply --paper-font-subhead;
        }

        .about a {
          color: var(--dark-primary-color);
        }

        system-health-card,
        integrations-card {
          display: block;
          max-width: 600px;
          margin: 0 auto;
          padding-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-info": HaPanelDevInfo;
  }
}

customElements.define("developer-tools-info", HaPanelDevInfo);
