import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../components/ha-spinner";
import type { HassioAddonDetails } from "../../../../../data/hassio/addon";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { appsStyle } from "../../resources/apps-style";
import "./app-info";

@customElement("app-info-tab")
class AppInfoDashboard extends LitElement {
  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon?: HassioAddonDetails;

  @property({ type: Boolean, attribute: "control-enabled" })
  public controlEnabled = false;

  protected render(): TemplateResult {
    if (!this.addon) {
      return html`<ha-spinner></ha-spinner>`;
    }

    return html`
      <div class="content">
        <app-info
          .narrow=${this.narrow}
          .route=${this.route}
          .hass=${this.hass}
          .addon=${this.addon}
          .controlEnabled=${this.controlEnabled}
        ></app-info>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      appsStyle,
      css`
        .content {
          margin: auto;
          padding: 8px;
          max-width: 1024px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-info-tab": AppInfoDashboard;
  }
}
