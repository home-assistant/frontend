import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import { CloudStatus } from "../../../data/cloud";
import { ExposeEntitySettings } from "../../../data/expose";

import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import { HomeAssistant, Route } from "../../../types";
import "./assist-pref";
import "./cloud-alexa-pref";
import "./cloud-discover";
import "./cloud-google-pref";
import { voiceAssistantTabs } from "./ha-config-voice-assistants";

@customElement("ha-config-voice-assistants-assistants")
export class HaConfigVoiceAssistantsAssistants extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ attribute: false }) public exposedEntities?: Record<
    string,
    ExposeEntitySettings
  >;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  protected render() {
    if (!this.hass) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${voiceAssistantTabs}
      >
        <div class="content">
          ${isComponentLoaded(this.hass, "assist_pipeline")
            ? html`
                <assist-pref
                  .dir=${computeRTLDirection(this.hass)}
                  .hass=${this.hass}
                  .cloudStatus=${this.cloudStatus}
                  .exposedEntities=${this.exposedEntities}
                ></assist-pref>
              `
            : nothing}
          ${this.cloudStatus?.logged_in
            ? html`
                <cloud-alexa-pref
                  .hass=${this.hass}
                  .exposedEntities=${this.exposedEntities}
                  .cloudStatus=${this.cloudStatus}
                  .dir=${computeRTLDirection(this.hass)}
                ></cloud-alexa-pref>
                <cloud-google-pref
                  .hass=${this.hass}
                  .exposedEntities=${this.exposedEntities}
                  .cloudStatus=${this.cloudStatus}
                  .dir=${computeRTLDirection(this.hass)}
                ></cloud-google-pref>
              `
            : html`<cloud-discover .hass=${this.hass}></cloud-discover>`}
        </div>
      </hass-tabs-subpage>
    `;
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
    }
    .content > * {
      display: block;
      margin: auto;
      max-width: 800px;
      margin-bottom: 24px;
    }
    a {
      text-decoration: none;
      color: inherit;
    }
  `;
}
