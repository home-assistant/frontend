import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import "../../../src/layouts/hass-tabs-subpage";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant, Route } from "../../../src/types";
import { supervisorTabs } from "../hassio-tabs";
import { hassioStyle } from "../resources/hassio-style";
import "./hassio-host-info";
import "./hassio-supervisor-info";
import "./hassio-supervisor-log";
import "./hassio-system-metrics";

@customElement("hassio-system")
class HassioSystem extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  protected render(): TemplateResult | void {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        hassio
        main-page
        .route=${this.route}
        .tabs=${supervisorTabs}
      >
        <span slot="header">System</span>
        <div class="content">
          <div class="card-group">
            <hassio-supervisor-info
              .hass=${this.hass}
              .supervisor=${this.supervisor}
            ></hassio-supervisor-info>
            <hassio-host-info
              .hass=${this.hass}
              .supervisor=${this.supervisor}
            ></hassio-host-info>
            <hassio-system-metrics
              .hass=${this.hass}
              .supervisor=${this.supervisor}
            ></hassio-system-metrics>
          </div>
          <hassio-supervisor-log .hass=${this.hass}></hassio-supervisor-log>
        </div>
      </hass-tabs-subpage>
    `;
  }

  static get styles(): CSSResult[] {
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
