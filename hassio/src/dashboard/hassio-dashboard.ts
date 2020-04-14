import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { HassioHassOSInfo } from "../../../src/data/hassio/host";
import {
  HassioHomeAssistantInfo,
  HassioSupervisorInfo,
} from "../../../src/data/hassio/supervisor";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import "./hassio-addons";
import "./hassio-update";

@customElement("hassio-dashboard")
class HassioDashboard extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public supervisorInfo!: HassioSupervisorInfo;

  @property() public hassInfo!: HassioHomeAssistantInfo;

  @property() public hassOsInfo!: HassioHassOSInfo;

  protected render(): TemplateResult {
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
