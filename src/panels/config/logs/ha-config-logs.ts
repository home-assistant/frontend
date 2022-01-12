import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import "./error-log-card";
import "./system-log-card";
import type { SystemLogCard } from "./system-log-card";

@customElement("ha-config-logs")
export class HaConfigLogs extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public route!: Route;

  @query("system-log-card", true) private systemLog?: SystemLogCard;

  public connectedCallback() {
    super.connectedCallback();
    if (this.systemLog && this.systemLog.loaded) {
      this.systemLog.fetchData();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.general}
      >
        <div class="content">
          <system-log-card .hass=${this.hass}></system-log-card>
          <error-log-card .hass=${this.hass}></error-log-card>
        </div>
      </hass-tabs-subpage>
    `;
  }

  static get styles(): CSSResultGroup {
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-logs": HaConfigLogs;
  }
}
