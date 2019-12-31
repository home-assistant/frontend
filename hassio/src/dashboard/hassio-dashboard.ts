import {
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
  property,
  customElement,
} from "lit-element";
import "./hassio-addons";
import "./hassio-update";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import {
  HassioSupervisorInfo,
  HassioHomeAssistantInfo,
  HassioHassOSInfo,
} from "../../../src/data/hassio";

@customElement("hassio-dashboard")
class HassioDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public supervisorInfo!: HassioSupervisorInfo;
  @property() public hassInfo!: HassioHomeAssistantInfo;
  @property() public hassOsInfo!: HassioHassOSInfo;

  protected render(): TemplateResult | void {
    return html`
      <div class="content">
        <hassio-update
          .hass=${this.hass}
          .hassInfo=${this.hassInfo}
          .supervisorInfo=${this.supervisorInfo}
          .hassOsInfo=${this.hassOsInfo}
        ></hassio-update>
        <hassio-addons
          .hass=${this.hass}
          .addons=${this.supervisorInfo.addons}
        ></hassio-addons>
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .content {
          margin: 0 auto;
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
