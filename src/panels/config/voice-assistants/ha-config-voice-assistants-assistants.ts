import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import { CloudStatus } from "../../../data/cloud";
import "../../../layouts/hass-tabs-subpage";
import { HomeAssistant, Route } from "../../../types";
import "./assist-pref";
import "./cloud-alexa-pref";
import "./cloud-google-pref";
import { voiceAssistantTabs } from "./ha-config-voice-assistants";

@customElement("ha-config-voice-assistants-assistants")
export class HaConfigVoiceAssistantsAssistants extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

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
            ? html`<assist-pref .hass=${this.hass}></assist-pref>`
            : nothing}
          ${this.cloudStatus?.logged_in
            ? html`<cloud-alexa-pref
                  .hass=${this.hass}
                  .cloudStatus=${this.cloudStatus}
                  dir=${computeRTLDirection(this.hass)}
                ></cloud-alexa-pref>
                <cloud-google-pref
                  .hass=${this.hass}
                  .cloudStatus=${this.cloudStatus}
                  dir=${computeRTLDirection(this.hass)}
                ></cloud-google-pref>`
            : html`<ha-card
                  header="Easily connect to voice assistants with Home Assistant Cloud"
                >
                  <div class="card-content">
                    With Home Assistant Cloud, you can connect your Home
                    Assistant instance in a few simple clicks to both Google
                    Assistant and Amazon Alexa. If you can connect it to Home
                    Assistant, you can now control it with your voice using the
                    Amazon Echo, Google Home or your Android phone.
                  </div>
                  <div class="card-actions">
                    <a
                      href="https://www.nabucasa.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <mwc-button>Learn more</mwc-button>
                    </a>
                  </div>
                </ha-card>
                ${isComponentLoaded(this.hass, "cloud")
                  ? html` <ha-card outlined>
                      <a href="/config/cloud/register">
                        <paper-item>
                          <paper-item-body two-line>
                            ${this.hass.localize(
                              "ui.panel.config.cloud.login.start_trial"
                            )}
                            <div secondary>
                              ${this.hass.localize(
                                "ui.panel.config.cloud.login.trial_info"
                              )}
                            </div>
                          </paper-item-body>
                          <ha-icon-next></ha-icon-next>
                        </paper-item>
                      </a>
                    </ha-card>`
                  : ""}`}
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
