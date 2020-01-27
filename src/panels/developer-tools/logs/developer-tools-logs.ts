import {
  LitElement,
  html,
  CSSResult,
  css,
  TemplateResult,
  property,
  query,
  customElement,
} from "lit-element";

import { HomeAssistant } from "../../../types";
import { haStyle } from "../../../resources/styles";

import "../logs/system-log-card";
import "../logs/error-log-card";
// tslint:disable-next-line
import { SystemLogCard } from "../logs/system-log-card";

@customElement("developer-tools-logs")
export class HaPanelDevLogs extends LitElement {
  @property() public hass!: HomeAssistant;

  @query("system-log-card") private systemLog?: SystemLogCard;

  public connectedCallback() {
    super.connectedCallback();
    if (this.systemLog && this.systemLog.loaded) {
      this.systemLog.fetchData();
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="content">
        <system-log-card .hass=${this.hass}></system-log-card>
        <error-log-card .hass=${this.hass}></error-log-card>
      </div>
    `;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-logs": HaPanelDevLogs;
  }
}
