import {
  LitElement,
  html,
  CSSResult,
  css,
  TemplateResult,
  property,
} from "lit-element";

import { HomeAssistant } from "../../../types";
import { haStyle } from "../../../resources/styles";

import "../logs/system-log-card";
import "../logs/error-log-card";

class HaPanelDevLogs extends LitElement {
  @property() public hass!: HomeAssistant;

  protected render(): TemplateResult | void {
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

customElements.define("developer-tools-logs", HaPanelDevLogs);
