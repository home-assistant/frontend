import "@material/mwc-button";

import { css, html, LitElement, nothing } from "lit";
import { mdiContentCopy } from "@mdi/js";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-language-picker";
import "../../../../components/ha-list-item";
import "../../../../components/ha-select";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-switch";
import type { CloudStatusLoggedIn } from "../../../../data/cloud";
import { updateCloudPref } from "../../../../data/cloud";
import type { CloudTTSInfo } from "../../../../data/cloud/tts";
import {
  getCloudTTSInfo,
  getCloudTtsLanguages,
} from "../../../../data/cloud/tts";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../types";
import { showTryTtsDialog } from "./show-dialog-cloud-tts-try";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import { showToast } from "../../../../util/toast";

export const getCloudTtsSupportedVoices = (
  language: string,
  info: CloudTTSInfo | undefined
) => {
  const voices: { voiceId: string; voiceName: string }[] = [];

  if (!info) {
    return voices;
  }

  for (const [curLang, voiceId, voiceName] of info.languages) {
    if (curLang === language) {
      voices.push({ voiceId, voiceName });
    }
  }

  return voices;
};

@customElement("cloud-tts-pref")
export class CloudTTSPref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatusLoggedIn;

  @property({ type: Boolean, reflect: true }) public narrow = false;

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
          ${this.hass.localize(
            "ui.panel.config.cloud.account.tts.description",
            {
              service: '"tts.cloud_say"',
            }
          )}
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
                  html`<ha-list-item .value=${voice.voiceId}>
                    ${voice.voiceName}
                  </ha-list-item>`
              )}
            </ha-select>
          </div>
        </div>
        <div class="card-actions">
          <div class="voice-id" @click=${this._copyVoiceId}>
            <div class="label">
              ${this.hass.localize(
                "ui.components.media-browser.tts.selected_voice_id"
              )}
            </div>
            <code>${defaultVoice[1]}</code>
            ${this.narrow
              ? nothing
              : html`
                  <ha-icon-button
                    .path=${mdiContentCopy}
                    title=${this.hass.localize(
                      "ui.components.media-browser.tts.copy_voice_id"
                    )}
                  ></ha-icon-button>
                `}
          </div>
          <div class="flex"></div>
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

  private async _handleLanguageChange(ev) {
    if (ev.detail.value === this.cloudStatus!.prefs.tts_default_voice[0]) {
      return;
    }
    this.savingPreferences = true;
    const language = ev.detail.value;

    const curVoice = this.cloudStatus!.prefs.tts_default_voice[1];
    const voices = this.getSupportedVoices(language, this.ttsInfo);
    const newVoice = voices.find((item) => item.voiceId === curVoice)
      ? curVoice
      : voices[0].voiceId;

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

  private async _handleVoiceChange(ev) {
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

  private async _copyVoiceId(ev) {
    ev.preventDefault();
    await copyToClipboard(this.cloudStatus!.prefs.tts_default_voice[1]);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  static styles = css`
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
      align-items: center;
    }
    code {
      margin-left: 6px;
      font-weight: var(--ha-font-weight-bold);
    }
    .voice-id {
      display: flex;
      align-items: center;
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
      --mdc-icon-size: 14px;
      --mdc-icon-button-size: 24px;
    }
    :host([narrow]) .voice-id {
      flex-direction: column;
      font-size: var(--ha-font-size-xs);
      align-items: start;
      align-items: left;
    }
    :host([narrow]) .label {
      text-transform: uppercase;
    }
    :host([narrow]) code {
      margin-left: 0;
    }
    .flex {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-tts-pref": CloudTTSPref;
  }
}
