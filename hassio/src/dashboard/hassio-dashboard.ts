import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import "../../../src/layouts/hass-tabs-subpage";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant, Route } from "../../../src/types";
import { supervisorTabs } from "../hassio-tabs";
import { hassioStyle } from "../resources/hassio-style";
import "./hassio-addons";
import "./hassio-update";

@customElement("hassio-dashboard")
class HassioDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .localizeFunc=${this.supervisor.localize}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${supervisorTabs}
        main-page
        supervisor
      >
        <span slot="header">
          ${this.supervisor.localize("panel.dashboard")}
        </span>

        <div class="content">
          <hassio-update
            .hass=${this.hass}
            .supervisor=${this.supervisor}
            .narrow=${this.narrow}
          ></hassio-update>
          <hassio-addons
            .hass=${this.hass}
            .supervisor=${this.supervisor}
            .narrow=${this.narrow}
          ></hassio-addons>
        </div>
      </hass-tabs-subpage>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      hassioStyle,
      css`
        .content {
          display: grid;
          max-width: 1400px;
          justify-content: center;
          grid-template-columns: repeat(2, auto);
          gap: 16px;
        }
        .content > * {
          display: block;
          min-width: 400px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-dashboard": HassioDashboard;
  }
}
