import { mdiPlayCircleOutline } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { storage } from "../../common/decorators/storage";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-textarea";
import type { HaTextArea } from "../../components/ha-textarea";
import { convertTextToSpeech } from "../../data/tts";
import { HomeAssistant } from "../../types";
import { showAlertDialog } from "../generic/show-dialog-box";
import { TTSTryDialogParams } from "./show-dialog-tts-try";
import "../../components/ha-circular-progress";

@customElement("dialog-tts-try")
export class TTSTryDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _loadingExample = false;

  @state() private _params?: TTSTryDialogParams;

  @state() private _valid = false;

  @query("#message") private _messageInput?: HaTextArea;

  @storage({
    key: "ttsTryMessages",
    state: false,
    subscribe: false,
  })
  private _messages?: Record<string, string>;

  public showDialog(params: TTSTryDialogParams) {
    this._params = params;
    this._valid = Boolean(this._defaultMessage);
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private get _defaultMessage() {
    const language = this._params!.language?.substring(0, 2);
    const userLanguage = this.hass.locale.language.substring(0, 2);
    // Load previous message in the right language
    if (language && this._messages?.[language]) {
      return this._messages[language];
    }
    // Only display example message if it's interface language
    if (language === userLanguage) {
      return this.hass.localize("ui.dialogs.tts-try.message_example");
    }
    return "";
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.dialogs.tts-try.header")
        )}
      >
        <ha-textarea
          autogrow
          id="message"
          .label=${this.hass.localize("ui.dialogs.tts-try.message")}
          .placeholder=${this.hass.localize(
            "ui.dialogs.tts-try.message_placeholder"
          )}
          .value=${this._defaultMessage}
          @input=${this._inputChanged}
          ?dialogInitialFocus=${!this._defaultMessage}
        >
        </ha-textarea>
        ${this._loadingExample
          ? html`
              <ha-circular-progress
                size="small"
                active
                alt=""
                slot="primaryAction"
                class="loading"
              ></ha-circular-progress>
            `
          : html`
              <ha-button
                ?dialogInitialFocus=${Boolean(this._defaultMessage)}
                slot="primaryAction"
                .label=${this.hass.localize("ui.dialogs.tts-try.play")}
                @click=${this._playExample}
                .disabled=${!this._valid}
              >
                <ha-svg-icon
                  slot="icon"
                  .path=${mdiPlayCircleOutline}
                ></ha-svg-icon>
              </ha-button>
            `}
      </ha-dialog>
    `;
  }

  private async _inputChanged() {
    this._valid = Boolean(this._messageInput?.value);
  }

  private async _playExample() {
    const message = this._messageInput?.value;
    if (!message) {
      return;
    }

    const platform = this._params!.engine;
    const language = this._params!.language;
    const voice = this._params!.voice;

    if (language) {
      this._messages = {
        ...this._messages,
        [language.substring(0, 2)]: message,
      };
    }

    this._loadingExample = true;

    const audio = new Audio();
    audio.play();

    let url;
    try {
      const result = await convertTextToSpeech(this.hass, {
        platform,
        message,
        language,
        options: { voice },
      });
      url = result.path;
    } catch (err: any) {
      this._loadingExample = false;
      showAlertDialog(this, {
        text: `Unable to load example. ${err.error || err.body || err}`,
        warning: true,
      });
      return;
    }
    audio.src = url;
    audio.addEventListener("canplaythrough", () => audio.play());
    audio.addEventListener("playing", () => {
      this._loadingExample = false;
    });
    audio.addEventListener("error", () => {
      showAlertDialog(this, { title: "Error playing audio." });
      this._loadingExample = false;
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-dialog {
        --mdc-dialog-max-width: 500px;
      }
      ha-textarea,
      ha-select {
        width: 100%;
      }
      ha-select {
        margin-top: 8px;
      }
      .loading {
        height: 36px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-tts-try": TTSTryDialog;
  }
}
