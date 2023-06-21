import "@material/mwc-list/mwc-list-item";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { storage } from "../../common/decorators/storage";
import { fireEvent } from "../../common/dom/fire_event";
import {
  MediaPlayerBrowseAction,
  MediaPlayerItem,
} from "../../data/media-player";
import {
  getProviderFromTTSMediaSource,
  getTTSEngine,
  TTSEngine,
} from "../../data/tts";
import { buttonLinkStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import "../ha-textarea";
import "../ha-language-picker";
import "../ha-tts-voice-picker";
import { fetchCloudStatus } from "../../data/cloud";

export interface TtsMediaPickedEvent {
  item: MediaPlayerItem;
}

declare global {
  interface HASSDomEvents {
    "tts-picked": TtsMediaPickedEvent;
  }
}

@customElement("ha-browse-media-tts")
class BrowseMediaTTS extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public item!: MediaPlayerItem;

  @property() public action!: MediaPlayerBrowseAction;

  @state() private _language?: string;

  @state() private _voice?: string;

  @state() private _provider?: TTSEngine;

  @storage({
    key: "TtsMessage",
    state: true,
    subscribe: false,
  })
  private _message!: string;

  protected render() {
    return html`<ha-card>
      <div class="card-content">
        <ha-textarea
          autogrow
          .label=${this.hass.localize(
            "ui.components.media-browser.tts.message"
          )}
          .value=${this._message ||
          this.hass.localize(
            "ui.components.media-browser.tts.example_message",
            {
              name: this.hass.user?.name || "",
            }
          )}
        >
        </ha-textarea>
        ${this._provider?.supported_languages?.length
          ? html` <div class="options">
              <ha-language-picker
                .hass=${this.hass}
                .languages=${this._provider.supported_languages}
                .value=${this._language}
                required
                @value-changed=${this._languageChanged}
              ></ha-language-picker>
              <ha-tts-voice-picker
                .hass=${this.hass}
                .value=${this._voice}
                .engineId=${this._provider.engine_id}
                .language=${this._language}
                required
                @value-changed=${this._voiceChanged}
              ></ha-tts-voice-picker>
            </div>`
          : nothing}
      </div>
      <div class="card-actions">
        <mwc-button @click=${this._ttsClicked}>
          ${this.hass.localize(
            `ui.components.media-browser.tts.action_${this.action}`
          )}
        </mwc-button>
      </div>
    </ha-card> `;
  }

  protected override willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (changedProps.has("item")) {
      if (this.item.media_content_id) {
        const params = new URLSearchParams(
          this.item.media_content_id.split("?")[1]
        );
        const message = params.get("message");
        const language = params.get("language");
        const voice = params.get("voice");
        if (message) {
          this._message = message;
        }
        if (language) {
          this._language = language;
        }
        if (voice) {
          this._voice = voice;
        }
        const provider = getProviderFromTTSMediaSource(
          this.item.media_content_id
        );
        if (provider !== this._provider?.engine_id) {
          this._provider = undefined;
          getTTSEngine(this.hass, provider).then((engine) => {
            this._provider = engine.provider;
            if (
              !this._language &&
              engine.provider.supported_languages?.length
            ) {
              const langRegionCode =
                `${this.hass.config.language}-${this.hass.config.country}`.toLowerCase();
              const countryLang = engine.provider.supported_languages.find(
                (lang) => lang.toLowerCase() === langRegionCode
              );
              if (countryLang) {
                this._language = countryLang;
                return;
              }
              this._language = engine.provider.supported_languages?.find(
                (lang) =>
                  lang.substring(0, 2) ===
                  this.hass.config.language.substring(0, 2)
              );
            }
          });

          if (provider === "cloud") {
            fetchCloudStatus(this.hass).then((status) => {
              if (status.logged_in) {
                this._language = status.prefs.tts_default_voice[0];
              }
            });
          }
        }
      }
    }

    if (changedProps.has("_message")) {
      return;
    }

    // Re-rendering can reset message because textarea content is newer than local storage.
    // But we don't want to write every keystroke to local storage.
    // So instead we just do it when we're going to render.
    const message = this.shadowRoot!.querySelector("ha-textarea")?.value;
    if (message !== undefined && message !== this._message) {
      this._message = message;
    }
  }

  private _languageChanged(ev) {
    this._language = ev.detail.value;
  }

  private _voiceChanged(ev) {
    this._voice = ev.detail.value;
  }

  private async _ttsClicked(): Promise<void> {
    const message = this.shadowRoot!.querySelector("ha-textarea")!.value;
    this._message = message;
    const item = { ...this.item };
    const query = new URLSearchParams();
    query.append("message", message);
    if (this._language) {
      query.append("language", this._language);
    }
    if (this._voice) {
      query.append("voice", this._voice);
    }
    item.media_content_id = `${
      item.media_content_id.split("?")[0]
    }?${query.toString()}`;
    item.can_play = true;
    item.title = message;
    fireEvent(this, "tts-picked", { item });
  }

  static override styles = [
    buttonLinkStyle,
    css`
      :host {
        margin: 16px auto;
        padding: 0 8px;
        display: flex;
        flex-direction: column;
        max-width: 448px;
      }
      .options {
        margin-top: 16px;
        display: flex;
        justify-content: space-between;
      }
      ha-textarea {
        width: 100%;
      }
      button.link {
        color: var(--primary-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-browse-media-tts": BrowseMediaTTS;
  }
}
