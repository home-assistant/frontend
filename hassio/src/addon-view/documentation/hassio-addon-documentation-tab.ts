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

import "./hassio-addon-documentation";

@customElement("hassio-addon-documentation-tab")
class HassioAddonDocumentationDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon?: HassioAddonDetails;

  protected render(): TemplateResult {
    if (!this.addon) {
      return html` <paper-spinner-lite active></paper-spinner-lite> `;
    }
    return html`
      <div class="content">
        <hassio-addon-documentation
          .hass=${this.hass}
          .addon=${this.addon}
        ></hassio-addon-documentation>
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        @media screen and (min-width: 1024px) {
          .content {
            width: 50%;
            margin: auto;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-documentation-tab": HassioAddonDocumentationDashboard;
  }
}
