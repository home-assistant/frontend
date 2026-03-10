import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../components/ha-spinner";
import type { HassioAddonDetails } from "../../../../../data/hassio/addon";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { supervisorAppsStyle } from "../../resources/supervisor-apps-style";
import "./supervisor-app-info";

@customElement("supervisor-app-info-tab")
class SupervisorAppInfoDashboard extends LitElement {
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
        <supervisor-app-info
          .narrow=${this.narrow}
          .route=${this.route}
          .hass=${this.hass}
          .addon=${this.addon}
          .controlEnabled=${this.controlEnabled}
        ></supervisor-app-info>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      supervisorAppsStyle,
      css`
        .content {
          margin: auto;
          padding: var(--ha-space-2);
          max-width: 1024px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-app-info-tab": SupervisorAppInfoDashboard;
  }
}
