import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-select";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-switch";
import "../../../../components/ha-language-picker";
import { CloudStatusLoggedIn, updateCloudPref } from "../../../../data/cloud";
import {
  CloudTTSInfo,
  getCloudTTSInfo,
  getCloudTtsLanguages,
  getCloudTtsSupportedVoices,
} from "../../../../data/cloud/tts";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../types";
import { showTryTtsDialog } from "./show-dialog-cloud-tts-try";

@customElement("cloud-tts-pref")
export class CloudTTSPref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatusLoggedIn;

  @state() private savingPreferences = false;

  @state() private ttsInfo?: CloudTTSInfo;

  protected render() {
    if (!this.cloudStatus || !this.ttsInfo) {
      return nothing;
    }

    const languages = this.getLanguages(this.ttsInfo);
    const defaultVoice = this.cloudStatus.prefs.tts_default_voice;
    const voices = this.getSupportedVoices(defaultVoice[0], this.ttsInfo);

    return html`
      <ha-card
        outlined
        header=${this.hass.localize("ui.panel.config.cloud.account.tts.title")}
      >
        <div class="card-content">
          ${this.hass.localize("ui.panel.config.cloud.account.tts.info", {
            service: '"tts.cloud_say"',
          })}
          <br /><br />
          <div class="row">
            <ha-language-picker
              .hass=${this.hass}
              .label=${this.hass.localize(
                "ui.panel.config.cloud.account.tts.default_language"
              )}
              .disabled=${this.savingPreferences}
              .value=${defaultVoice[0]}
              .languages=${languages}
              @value-changed=${this._handleLanguageChange}
            >
            </ha-language-picker>

            <ha-select
              .label=${this.hass.localize(
                "ui.panel.config.cloud.account.tts.default_voice"
              )}
              .disabled=${this.savingPreferences}
              .value=${defaultVoice[1]}
              @selected=${this._handleVoiceChange}
            >
              ${voices.map(
                (voice) =>
                  html`<mwc-list-item .value=${voice}>${voice}</mwc-list-item>`
              )}
            </ha-select>
          </div>
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._openTryDialog}>
            ${this.hass.localize("ui.panel.config.cloud.account.tts.try")}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  protected updated(changedProps) {
    if (
      changedProps.has("cloudStatus") &&
      this.cloudStatus?.prefs.tts_default_voice?.[0] !==
        changedProps.get("cloudStatus")?.prefs.tts_default_voice?.[0]
    ) {
      this.renderRoot.querySelector("ha-select")?.layoutOptions();
    }
  }

  protected willUpdate(changedProps) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      getCloudTTSInfo(this.hass).then((info) => {
        this.ttsInfo = info;
      });
    }
    if (changedProps.has("cloudStatus")) {
      this.savingPreferences = false;
    }
  }

  private getLanguages = memoizeOne(getCloudTtsLanguages);

  private getSupportedVoices = memoizeOne(getCloudTtsSupportedVoices);

  private _openTryDialog() {
    showTryTtsDialog(this, {
      defaultVoice: this.cloudStatus!.prefs.tts_default_voice,
    });
  }

  async _handleLanguageChange(ev) {
    if (ev.detail.value === this.cloudStatus!.prefs.tts_default_voice[0]) {
      return;
    }
    this.savingPreferences = true;
    const language = ev.detail.value;

    const curVoice = this.cloudStatus!.prefs.tts_default_voice[1];
    const voices = this.getSupportedVoices(language, this.ttsInfo);
    const newVoice = voices.find((item) => item === curVoice)
      ? curVoice
      : voices[0];

    try {
      await updateCloudPref(this.hass, {
        tts_default_voice: [language, newVoice],
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      this.savingPreferences = false;
      // eslint-disable-next-line no-console
      console.error(err);
      showAlertDialog(this, {
        text: `Unable to save default language. ${err}`,
        warning: true,
      });
    }
  }

  async _handleVoiceChange(ev) {
    if (ev.target.value === this.cloudStatus!.prefs.tts_default_voice[1]) {
      return;
    }
    this.savingPreferences = true;
    const language = this.cloudStatus!.prefs.tts_default_voice[0];
    const voice = ev.target.value;

    try {
      await updateCloudPref(this.hass, {
        tts_default_voice: [language, voice],
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      this.savingPreferences = false;
      // eslint-disable-next-line no-console
      console.error(err);
      showAlertDialog(this, {
        text: `Unable to save default voice. ${err}`,
        warning: true,
      });
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      a {
        color: var(--primary-color);
      }
      .example {
        position: absolute;
        right: 16px;
        inset-inline-end: 16px;
        inset-inline-start: initial;
        top: 16px;
      }
      .row {
        display: flex;
      }
      .row > * {
        flex: 1;
        width: 0;
      }
      .row > *:first-child {
        margin-right: 8px;
        margin-inline-end: 8px;
        margin-inline-start: initial;
      }
      .row > *:last-child {
        margin-left: 8px;
        margin-inline-start: 8px;
        margin-inline-end: initial;
      }
      .card-actions {
        display: flex;
        flex-direction: row-reverse;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-tts-pref": CloudTTSPref;
  }
}
