import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant, PanelInfo, Route } from "../../types";
import type { Hacs } from "./data/hacs";
import { HacsElement } from "./hacs";
import "./hacs-router";
import { HacsStyles } from "./styles/hacs-common-style";
import { hacsStyleVariables } from "./styles/variables";

@customElement("ha-panel-store")
class HaPanelStore extends HacsElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public hacs!: Hacs;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public panel?: PanelInfo;

  protected render() {
    if (!this.hass || !this.hacs?.info?.categories?.length) {
      return nothing;
    }

    return html`
      <hacs-router
        .hass=${this.hass}
        .hacs=${this.hacs}
        .route=${this.route}
        .narrow=${this.narrow}
      ></hacs-router>
    `;
  }

  static get styles() {
    return [
      HacsStyles,
      hacsStyleVariables,
      css`
        hass-loading-screen {
          height: 100vh;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-store": HaPanelStore;
  }
}
