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

const JS_TYPE = __BUILD__;
const JS_VERSION = __VERSION__;
const OPT_IN_PANEL = "states";

class HaPanelDevInfo extends LitElement {
  @property() public hass!: HomeAssistant;

  protected render(): TemplateResult | void {
    const hass = this.hass;
    const customUiList: Array<{ name: string; url: string; version: string }> =
      (window as any).CUSTOM_UI_LIST || [];

    const nonDefaultLink =
      localStorage.defaultPage === OPT_IN_PANEL && OPT_IN_PANEL === "states"
        ? "/lovelace"
        : "/states";

    const nonDefaultLinkText =
      localStorage.defaultPage === OPT_IN_PANEL && OPT_IN_PANEL === "states"
        ? "Go to the Lovelace UI"
        : "Go to the states UI";

    const defaultPageText = `${
      localStorage.defaultPage === OPT_IN_PANEL ? "Remove" : "Set"
    } ${OPT_IN_PANEL} as default page on this device`;

    return html`
      <div class="about">
        <p class="version">
          <a href="https://www.home-assistant.io" target="_blank"
            ><img
              src="/static/icons/favicon-192x192.png"
              height="192"
              alt="Home Assistant logo"
          /></a>
          <br />
          <h2>Home Assistant ${hass.config.version}</h2>
        </p>
        <p>
          Path to configuration.yaml: ${hass.config.config_dir}
        </p>
        <p class="develop">
          <a
            href="https://www.home-assistant.io/developers/credits/"
            target="_blank"
          >
            Developed by a bunch of awesome people.
          </a>
        </p>
        <p>
          Published under the Apache 2.0 license<br />
          Source:
          <a
            href="https://github.com/home-assistant/home-assistant"
            target="_blank"
            >server</a
          >
          &mdash;
          <a
            href="https://github.com/home-assistant/home-assistant-polymer"
            target="_blank"
            >frontend-ui</a
          >
        </p>
        <p>
          Built using
          <a href="https://www.python.org">Python 3</a>,
          <a href="https://www.polymer-project.org" target="_blank">Polymer</a>,
          Icons by
          <a href="https://www.google.com/design/icons/" target="_blank"
            >Google</a
          >
          and
          <a href="https://MaterialDesignIcons.com" target="_blank"
            >MaterialDesignIcons.com</a
          >.
        </p>
        <p>
          Frontend version: ${JS_VERSION} - ${JS_TYPE}
          ${
            customUiList.length > 0
              ? html`
                  <div>
                    Custom UIs:
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
        <p>
          <a href="${nonDefaultLink}">${nonDefaultLinkText}</a><br />
          <a href="#" @click="${this._toggleDefaultPage}">${defaultPageText}</a
          ><br />
        </p>
      </div>
      <div class="content">
        <system-health-card .hass=${this.hass}></system-health-card>
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

  protected _toggleDefaultPage(): void {
    if (localStorage.defaultPage === OPT_IN_PANEL) {
      delete localStorage.defaultPage;
    } else {
      localStorage.defaultPage = OPT_IN_PANEL;
    }
    this.requestUpdate();
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

        system-health-card {
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
