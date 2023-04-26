import { consume } from "@lit-labs/context";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import { CloudStatus } from "../../../data/cloud";
import { entitiesContext } from "../../../data/context";
import {
  ExtEntityRegistryEntry,
  getExtendedEntityRegistryEntries,
} from "../../../data/entity_registry";
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

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  _entities!: HomeAssistant["entities"];

  @state() private _extEntities?: Record<string, ExtEntityRegistryEntry>;

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
                  .hass=${this.hass}
                  .cloudStatus=${this.cloudStatus}
                  .extEntities=${this._extEntities}
                ></assist-pref>
              `
            : nothing}
          ${this.cloudStatus?.logged_in
            ? html`
                <cloud-alexa-pref
                  .hass=${this.hass}
                  .extEntities=${this._extEntities}
                  .cloudStatus=${this.cloudStatus}
                  dir=${computeRTLDirection(this.hass)}
                ></cloud-alexa-pref>
                <cloud-google-pref
                  .hass=${this.hass}
                  .extEntities=${this._extEntities}
                  .cloudStatus=${this.cloudStatus}
                  dir=${computeRTLDirection(this.hass)}
                ></cloud-google-pref>
              `
            : html`<cloud-discover .hass=${this.hass}></cloud-discover>`}
        </div>
      </hass-tabs-subpage>
    `;
  }

  public willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("_entities")) {
      this._fetchExtendedEntities();
    }
  }

  private async _fetchExtendedEntities() {
    this._extEntities = await getExtendedEntityRegistryEntries(
      this.hass,
      Object.keys(this._entities)
    );
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
