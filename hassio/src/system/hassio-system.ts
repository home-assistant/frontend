import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { atLeastVersion } from "../../../src/common/config/version";
import type { Supervisor } from "../../../src/data/supervisor/supervisor";
import "../../../src/layouts/hass-tabs-subpage";
import { haStyle } from "../../../src/resources/styles";
import type { HomeAssistant, Route } from "../../../src/types";
import { supervisorTabs } from "../hassio-tabs";
import { hassioStyle } from "../resources/hassio-style";
import "./hassio-core-info";
import "./hassio-host-info";
import "./hassio-supervisor-info";
import "./hassio-supervisor-log";

@customElement("hassio-system")
class HassioSystem extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  protected render(): TemplateResult | undefined {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .localizeFunc=${this.supervisor.localize}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${supervisorTabs(this.hass)}
        .mainPage=${!atLeastVersion(this.hass.config.version, 2021, 12)}
        back-path="/config"
        supervisor
      >
        <span slot="header"> ${this.supervisor.localize("panel.system")} </span>
        <div class="content">
          <div class="card-group">
            <hassio-core-info
              .hass=${this.hass}
              .supervisor=${this.supervisor}
            ></hassio-core-info>
            <hassio-supervisor-info
              .hass=${this.hass}
              .supervisor=${this.supervisor}
            ></hassio-supervisor-info>
            <hassio-host-info
              .hass=${this.hass}
              .supervisor=${this.supervisor}
            ></hassio-host-info>
          </div>
          <hassio-supervisor-log
            .hass=${this.hass}
            .supervisor=${this.supervisor}
          ></hassio-supervisor-log>
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
          margin: 8px;
          color: var(--primary-text-color);
        }
        .title {
          margin-top: 24px;
          color: var(--primary-text-color);
          font-size: 2em;
          padding-left: 8px;
          padding-inline-start: 8px;
          padding-inline-end: initial;
          margin-bottom: 8px;
        }
        hassio-supervisor-log {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-system": HassioSystem;
  }
}
