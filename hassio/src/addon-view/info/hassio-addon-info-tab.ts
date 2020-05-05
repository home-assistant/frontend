import "@polymer/paper-spinner/paper-spinner-lite";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { HomeAssistant } from "../../../../src/types";
import { HassioAddonDetails } from "../../../../src/data/hassio/addon";
import { hassioStyle } from "../../resources/hassio-style";
import { haStyle } from "../../../../src/resources/styles";

import "./hassio-addon-info";

@customElement("hassio-addon-info-tab")
class HassioAddonInfoDashboard extends LitElement {
  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon?: HassioAddonDetails;

  protected render(): TemplateResult {
    if (!this.addon) {
      return html` <paper-spinner-lite active></paper-spinner-lite> `;
    }

    return html`
      <div class="content">
        <hassio-addon-info
          .narrow=${this.narrow}
          .hass=${this.hass}
          .addon=${this.addon}
        ></hassio-addon-info>
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
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
    "hassio-addon-info-tab": HassioAddonInfoDashboard;
  }
}
