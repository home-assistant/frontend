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
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/layouts/hass-tabs-subpage";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant, Route } from "../../../src/types";
import { supervisorTabs } from "../hassio-tabs";
import "./hassio-addons";
import "./hassio-update";

@customElement("hassio-dashboard")
class HassioDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public supervisorInfo!: HassioSupervisorInfo;

  @property({ attribute: false }) public hassInfo!: HassioHomeAssistantInfo;

  @property({ attribute: false }) public hassOsInfo!: HassioHassOSInfo;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._postUpdateDialog();
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        hassio
        main-page
        .route=${this.route}
        .tabs=${supervisorTabs}
      >
        <span slot="header">Dashboard</span>
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
      </hass-tabs-subpage>
    `;
  }

  private async _postUpdateDialog() {
    const previousVersion = localStorage.PendingCoreUpgrade;

    if (!previousVersion) {
      return;
    }

    // Clear key in localStorage
    localStorage.removeItem("PendingCoreUpgrade");

    if (previousVersion && previousVersion !== this.hass.config.version) {
      showAlertDialog(this, {
        title: "Update sucessfull",
        text: "Home Assistant was updated successfully",
      });
    } else if (
      previousVersion &&
      previousVersion === this.hass.config.version
    ) {
      showAlertDialog(this, {
        title: "Update failed",
        text: "The update failed, check supervisor logs for more details",
      });
    }
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
