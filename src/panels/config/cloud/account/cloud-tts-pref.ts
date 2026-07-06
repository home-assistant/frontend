import { mdiContentCopy, mdiPlayCircleOutline, mdiRobot } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-language-picker";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-select";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-textarea";
import "../../../../components/ha-tip";
import "../../../../components/voice-assistant-brand-icon";
import type {
  HaSelectOption,
  HaSelectSelectEvent,
} from "../../../../components/ha-select";
import type { HaTextArea } from "../../../../components/ha-textarea";
import { showAutomationEditor } from "../../../../data/automation";
import type { CloudStatusLoggedIn } from "../../../../data/cloud";
import { updateCloudPref } from "../../../../data/cloud";
import type { CloudTTSInfo } from "../../../../data/cloud/tts";
import {
  getCloudTTSInfo,
  getCloudTtsLanguages,
} from "../../../../data/cloud/tts";
import { MediaPlayerEntityFeature } from "../../../../data/media-player";
import { convertTextToSpeech } from "../../../../data/tts";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import { cloudSubpageStyle } from "./cloud-subpage-style";

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

  @state() private _loadingExample = false;

  @query("#message") private _messageInput?: HaTextArea;

  @storage({ key: "cloudTtsTryMessage", state: false, subscribe: false })
  private _message!: string;

  @storage({ key: "cloudTtsTryTarget", state: false, subscribe: false })
  private _target!: string;

  protected render() {
    if (!this.cloudStatus || !this.ttsInfo) {
      return nothing;
    }

    const languages = this.getLanguages(this.ttsInfo);
    const defaultVoice = this.cloudStatus.prefs.tts_default_voice;
    const voices = this.getSupportedVoices(defaultVoice[0], this.ttsInfo);

    const target = this._target || "browser";
    const targetOptions = this._getTargetOptions(
      this.hass.states,
      this.hass.localize(
        "ui.panel.config.cloud.account.tts.dialog.target_browser"
      )
    );

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.cloud.account.tts.title")}
        back-path="/config/cloud/account"
      >
        <div class="content">
          <ha-card outlined>
            <div class="card-header">
              <voice-assistant-brand-icon
                .hass=${this.hass}
                .voiceAssistantId=${"conversation"}
              ></voice-assistant-brand-icon>
              ${this.hass.localize(
                "ui.panel.config.cloud.account.assist.card_title"
              )}
            </div>
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.assist.description"
                )}
              </p>
            </div>
            <div class="card-actions">
              <ha-button
                appearance="plain"
                href="https://www.home-assistant.io/voice_control/"
                target="_blank"
                rel="noreferrer"
              >
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.assist.link_learn_more"
                )}
              </ha-button>
              <ha-button
                appearance="filled"
                href="/config/voice-assistants/assistants"
              >
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.assist.configure"
                )}
              </ha-button>
            </div>
          </ha-card>
          <ha-card
            outlined
            header=${this.hass.localize(
              "ui.panel.config.cloud.account.tts.card_title"
            )}
          >
            <div class="card-content">
              <ha-md-list>
                <ha-md-list-item>
                  <span slot="headline">
                    ${this.hass.localize(
                      "ui.panel.config.cloud.account.tts.default_language"
                    )}
                  </span>
                  <span slot="supporting-text">
                    ${this.hass.localize(
                      "ui.panel.config.cloud.account.tts.default_language_description"
                    )}
                  </span>
                  <ha-language-picker
                    slot="end"
                    .hass=${this.hass}
                    .label=${""}
                    .disabled=${this.savingPreferences}
                    .value=${defaultVoice[0]}
                    .languages=${languages}
                    noClearButton
                    @value-changed=${this._handleLanguageChange}
                  >
                  </ha-language-picker>
                </ha-md-list-item>
                <ha-md-list-item>
                  <span slot="headline">
                    ${this.hass.localize(
                      "ui.panel.config.cloud.account.tts.default_voice"
                    )}
                  </span>
                  <span slot="supporting-text">
                    ${this.hass.localize(
                      "ui.panel.config.cloud.account.tts.default_voice_description"
                    )}
                  </span>
                  <ha-select
                    slot="end"
                    .disabled=${this.savingPreferences}
                    .value=${defaultVoice[1]}
                    @selected=${this._handleVoiceChange}
                    .options=${voices.map((voice) => ({
                      value: voice.voiceId,
                      label: voice.voiceName,
                    }))}
                  >
                  </ha-select>
                </ha-md-list-item>
                <ha-md-list-item>
                  <span slot="headline">
                    ${this.hass.localize(
                      "ui.components.media-browser.tts.selected_voice_id"
                    )}
                  </span>
                  <code slot="supporting-text">${defaultVoice[1]}</code>
                  <ha-icon-button
                    slot="end"
                    .path=${mdiContentCopy}
                    .label=${this.hass.localize(
                      "ui.components.media-browser.tts.copy_voice_id"
                    )}
                    @click=${this._copyVoiceId}
                  ></ha-icon-button>
                </ha-md-list-item>
              </ha-md-list>
              <div class="try-tts">
                <span class="try-heading">
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.tts.dialog.header"
                  )}
                </span>
                <ha-textarea
                  id="message"
                  resize="auto"
                  .label=${this.hass.localize(
                    "ui.panel.config.cloud.account.tts.dialog.message"
                  )}
                  .value=${
                    this._message ||
                    this.hass.localize(
                      "ui.panel.config.cloud.account.tts.dialog.example_message",
                      { name: this.hass.user!.name }
                    )
                  }
                ></ha-textarea>
                <ha-select
                  id="target"
                  .label=${this.hass.localize(
                    "ui.panel.config.cloud.account.tts.dialog.target"
                  )}
                  .value=${target}
                  @selected=${this._handleTargetChanged}
                  .options=${targetOptions}
                ></ha-select>
                <div class="try-actions">
                  <ha-button
                    appearance="plain"
                    .disabled=${target === "browser"}
                    @click=${this._createAutomation}
                  >
                    <ha-svg-icon slot="start" .path=${mdiRobot}></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.config.cloud.account.tts.dialog.create_automation"
                    )}
                  </ha-button>
                  <ha-button
                    appearance="filled"
                    @click=${this._playExample}
                    .disabled=${this._loadingExample}
                  >
                    <ha-svg-icon
                      slot="start"
                      .path=${mdiPlayCircleOutline}
                    ></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.config.cloud.account.tts.dialog.play"
                    )}
                  </ha-button>
                </div>
              </div>
            </div>
            <div class="card-actions">
              <ha-button
                appearance="plain"
                href="https://support.nabucasa.com/hc/en-us/articles/25619386304541"
                target="_blank"
                rel="noreferrer"
              >
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.tts.link_learn_more"
                )}
              </ha-button>
            </div>
          </ha-card>
          <ha-card
            outlined
            header=${this.hass.localize(
              "ui.panel.config.cloud.account.stt.card_title"
            )}
          >
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.stt.description"
                )}
              </p>
            </div>
            <div class="card-actions">
              <ha-button
                appearance="plain"
                href="https://support.nabucasa.com/hc/en-us/articles/29718084245149"
                target="_blank"
                rel="noreferrer"
              >
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.stt.link_learn_more"
                )}
              </ha-button>
            </div>
          </ha-card>
          <ha-tip .hass=${this.hass}>
            ${this.hass.localize("ui.panel.config.cloud.account.tts.tip")}
          </ha-tip>
        </div>
      </hass-subpage>
    `;
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
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

  // Memoized on hass.states identity: rebuilt when states change (so a media
  // player rename is picked up) and reused across self-triggered re-renders
  // (target selection, saving, loading example) where states is unchanged.
  private _getTargetOptions = memoizeOne(
    (
      states: HomeAssistant["states"],
      browserLabel: string
    ): HaSelectOption[] => [
      { value: "browser", label: browserLabel },
      ...Object.values(states)
        .filter(
          (entity) =>
            computeStateDomain(entity) === "media_player" &&
            supportsFeature(entity, MediaPlayerEntityFeature.PLAY_MEDIA)
        )
        .map((entity) => ({
          value: entity.entity_id,
          label: computeStateName(entity),
        })),
    ]
  );

  private async _copyVoiceId(ev: Event) {
    ev.preventDefault();
    await copyToClipboard(this.cloudStatus!.prefs.tts_default_voice[1]);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private _handleTargetChanged(ev: HaSelectSelectEvent) {
    this._target = ev.detail.value;
    this.requestUpdate("_target");
  }

  private async _playExample() {
    const message = this._messageInput?.value;
    if (!message) {
      return;
    }
    this._message = message;

    const target = this._target || "browser";
    if (target === "browser") {
      // The audio element must be created + played from a user action (iOS).
      const audio = new Audio();
      audio.play();
      this._playBrowser(message, audio);
    } else {
      this.hass.callService("tts", "cloud_say", {
        entity_id: target,
        message,
      });
    }
  }

  private _createAutomation() {
    const message = this._messageInput!.value!;
    this._message = message;
    showAutomationEditor({
      action: [
        {
          service: "tts.cloud_say",
          data: { entity_id: this._target, message },
        },
      ],
    });
  }

  private async _playBrowser(message: string, audio: HTMLAudioElement) {
    this._loadingExample = true;
    const [language, voice] = this.cloudStatus!.prefs.tts_default_voice;

    let url: string;
    try {
      const result = await convertTextToSpeech(this.hass, {
        platform: "cloud",
        message,
        language,
        options: { voice },
      });
      url = result.path;
    } catch (err: any) {
      this._loadingExample = false;
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.cloud.account.tts.unable_load_example",
          { error: err.error || err.body || err }
        ),
        warning: true,
      });
      return;
    }
    audio.src = url;
    audio.addEventListener("canplaythrough", () => {
      audio.play();
    });
    audio.addEventListener("playing", () => {
      this._loadingExample = false;
    });
    audio.addEventListener("error", () => {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.cloud.account.tts.error_playing_audio"
        ),
      });
      this._loadingExample = false;
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

  private async _handleVoiceChange(ev: HaSelectSelectEvent) {
    const voice = ev.detail.value;
    if (!voice || voice === this.cloudStatus!.prefs.tts_default_voice[1]) {
      return;
    }
    this.savingPreferences = true;
    const language = this.cloudStatus!.prefs.tts_default_voice[0];

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

  static styles = [
    haStyle,
    cloudSubpageStyle,
    css`
      a {
        color: var(--primary-color);
      }
      .card-header {
        display: flex;
        align-items: center;
        gap: var(--ha-space-3);
      }
      .card-content {
        padding-left: 0;
        padding-right: 0;
      }
      .card-content p {
        color: var(--secondary-text-color);
        padding-inline: var(--ha-space-4);
        margin: 0;
      }
      .try-tts {
        padding-inline: var(--ha-space-4);
        margin-top: var(--ha-space-3);
      }
      .try-heading {
        display: block;
        font-weight: var(--ha-font-weight-medium);
        margin-bottom: var(--ha-space-2);
      }
      .try-tts ha-textarea,
      .try-tts ha-select {
        display: block;
        width: 100%;
        margin-bottom: var(--ha-space-2);
      }
      .try-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--ha-space-2);
        flex-wrap: wrap;
      }
      ha-md-list {
        background: none;
        --md-list-item-leading-space: var(--ha-space-4);
        --md-list-item-trailing-space: var(--ha-space-4);
      }
      ha-md-list-item {
        --md-item-overflow: visible;
      }
      ha-language-picker,
      ha-select {
        min-width: 210px;
      }
      @media all and (max-width: 450px) {
        ha-language-picker,
        ha-select {
          min-width: 160px;
          width: 160px;
        }
      }
      .card-actions {
        display: flex;
        justify-content: space-between;
      }
      ha-tip {
        max-width: 600px;
        margin: 0 auto;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-tts-pref": CloudTTSPref;
  }
}
