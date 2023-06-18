import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import "../../layouts/hass-error-screen";
import "../../layouts/hass-subpage";
import { HomeAssistant, PanelInfo } from "../../types";

@customElement("ha-panel-iframe")
class HaPanelIframe extends LitElement {
  @property() hass!: HomeAssistant;

  @property({ type: Boolean }) narrow!: boolean;

  @property() panel!: PanelInfo<{ url: string }>;

  render() {
    if (
      location.protocol === "https:" &&
      new URL(this.panel.config.url, location.toString()).protocol !== "https:"
    ) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
          error="Unable to load iframes that load websites over http:// if Home Assistant is served over https://."
          rootnav
        ></hass-error-screen>
      `;
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.panel.title}
        main-page
      >
        <iframe
          title=${ifDefined(
            this.panel.title === null ? undefined : this.panel.title
          )}
          src=${this.panel.config.url}
          sandbox="allow-forms allow-popups allow-pointer-lock allow-same-origin allow-scripts allow-modals allow-downloads"
          allow="fullscreen"
        ></iframe>
      </hass-subpage>
    `;
  }

  static styles = css`
    iframe {
      border: 0;
      width: 100%;
      position: absolute;
      height: 100%;
      background-color: var(--primary-background-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-iframe": HaPanelIframe;
  }
}
