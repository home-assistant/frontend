import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import {
  Supervisor,
  supervisorCollection,
} from "../../src/data/supervisor/supervisor";
import "../../src/layouts/hass-loading-screen";
import { HomeAssistant, Route } from "../../src/types";
import "./hassio-panel-router";

@customElement("hassio-panel")
class HassioPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    if (
      Object.keys(supervisorCollection).some(
        (collection) => !this.supervisor[collection]
      )
    ) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }
    return html`
      <hassio-panel-router
        .hass=${this.hass}
        .supervisor=${this.supervisor}
        .route=${this.route}
        .narrow=${this.narrow}
      ></hassio-panel-router>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --app-header-background-color: var(--sidebar-background-color);
        --app-header-text-color: var(--sidebar-text-color);
        --app-header-border-bottom: 1px solid var(--divider-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-panel": HassioPanel;
  }
}
