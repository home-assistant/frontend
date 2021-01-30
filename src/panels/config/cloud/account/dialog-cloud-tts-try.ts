import "@material/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../../../../types";
import { TryTtsDialogParams } from "./show-dialog-cloud-tts-try";
import { haStyleDialog } from "../../../../resources/styles";
import { fireEvent } from "../../../../common/dom/fire_event";
import { convertTextToSpeech } from "../../../../data/tts";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import "@polymer/paper-input/paper-textarea";
import "../../../../components/ha-paper-dropdown-menu";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import { SUPPORT_PLAY_MEDIA } from "../../../../data/media-player";
import { createCloseHeading } from "../../../../components/ha-dialog";
import { mdiPlayCircleOutline } from "@mdi/js";
import type { PaperListboxElement } from "@polymer/paper-listbox/paper-listbox";
import type { PaperTextareaElement } from "@polymer/paper-input/paper-textarea";
import { LocalStorage } from "../../../../common/decorators/local-storage";

@customElement("dialog-cloud-try-tts")
export class DialogTryTts extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _loadingExample = false;

  @internalProperty() private _params?: TryTtsDialogParams;

  @query("#target") private _targetInput?: PaperListboxElement;

  @query("#message") private _messageInput?: PaperTextareaElement;

  @LocalStorage("cloudTtsTryMessage") private _message?: string;

  @LocalStorage("cloudTtsTryTarget") private _target?: string;

  public showDialog(params: TryTtsDialogParams) {
    this._params = params;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.cloud.account.tts.dialog.header")
        )}
      >
        <div>
          <paper-textarea
            id="message"
            label="Message"
            .value=${this._message ||
            this.hass.localize(
              "ui.panel.config.cloud.account.tts.dialog.example_message",
              "name",
              this.hass.user!.name
            )}
          >
          </paper-textarea>

          <ha-paper-dropdown-menu
            .label=${this.hass.localize(
              "ui.panel.config.cloud.account.tts.dialog.target"
            )}
          >
            <paper-listbox
              id="target"
              slot="dropdown-content"
              attr-for-selected="item-value"
              .selected=${this._target || "browser"}
            >
              <paper-item item-value="browser">
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.tts.dialog.target_browser"
                )}
              </paper-item>
              ${Object.values(this.hass.states)
                .filter(
                  (entity) =>
                    computeStateDomain(entity) === "media_player" &&
                    supportsFeature(entity, SUPPORT_PLAY_MEDIA)
                )
                .map(
                  (entity) => html`
                    <paper-item .itemValue=${entity.entity_id}>
                      ${computeStateName(entity)}
                    </paper-item>
                  `
                )}
            </paper-listbox>
          </ha-paper-dropdown-menu>
        </div>
        <mwc-button
          slot="primaryAction"
          @click=${this._playExample}
          .disabled=${this._loadingExample}
        >
          <ha-svg-icon .path=${mdiPlayCircleOutline}></ha-svg-icon>
          &nbsp;${this.hass.localize(
            "ui.panel.config.cloud.account.tts.dialog.play"
          )}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private async _playExample() {
    const target = String(this._targetInput?.selected);
    const message = this._messageInput?.value;

    if (!message || !target) {
      return;
    }

    this._message = message;
    this._target = target;

    if (target === "browser") {
      // We create the audio element here + do a play, because iOS requires it to be done by user action
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

  private async _playBrowser(message: string, audio: HTMLAudioElement) {
    this._loadingExample = true;

    const language = this._params!.defaultVoice[0];
    const gender = this._params!.defaultVoice[1];

    let url;
    try {
      const result = await convertTextToSpeech(this.hass, {
        platform: "cloud",
        message,
        language,
        options: { gender },
      });
      url = result.path;
    } catch (err) {
      this._loadingExample = false;
      showAlertDialog(this, {
        text: `Unable to load example. ${err.error || err.body || err}`,
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
      showAlertDialog(this, { title: "Error playing audio." });
      this._loadingExample = false;
    });
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 500px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-cloud-try-tts": DialogTryTts;
  }
}
