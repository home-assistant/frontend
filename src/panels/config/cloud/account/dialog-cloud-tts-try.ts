import { mdiPlayCircleOutline, mdiRobot } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-select";
import type {
  HaSelectOption,
  HaSelectSelectEvent,
} from "../../../../components/ha-select";
import "../../../../components/ha-textarea";
import type { HaTextArea } from "../../../../components/ha-textarea";
import "../../../../components/ha-wa-dialog";
import { showAutomationEditor } from "../../../../data/automation";
import { MediaPlayerEntityFeature } from "../../../../data/media-player";
import { convertTextToSpeech } from "../../../../data/tts";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { TryTtsDialogParams } from "./show-dialog-cloud-tts-try";

@customElement("dialog-cloud-try-tts")
export class DialogTryTts extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _loadingExample = false;

  @state() private _open = false;

  @state() private _params?: TryTtsDialogParams;

  @query("#message") private _messageInput?: HaTextArea;

  @storage({
    key: "cloudTtsTryMessage",
    state: false,
    subscribe: false,
  })
  private _message!: string;

  @storage({
    key: "cloudTtsTryTarget",
    state: false,
    subscribe: false,
  })
  private _target!: string;

  public showDialog(params: TryTtsDialogParams) {
    this._params = params;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._open = false;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const target = this._target || "browser";

    const targetOptions: HaSelectOption[] = Object.values(this.hass.states)
      .filter(
        (entity) =>
          computeStateDomain(entity) === "media_player" &&
          supportsFeature(entity, MediaPlayerEntityFeature.PLAY_MEDIA)
      )
      .map((entity) => ({
        value: entity.entity_id,
        label: computeStateName(entity),
      }));

    targetOptions.unshift({
      value: "browser",
      label: this.hass.localize(
        "ui.panel.config.cloud.account.tts.dialog.target_browser"
      ),
    });

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.cloud.account.tts.dialog.header"
        )}
        width="medium"
        @closed=${this._dialogClosed}
      >
        <div>
          <ha-textarea
            autogrow
            id="message"
            autofocus
            .label=${this.hass.localize(
              "ui.panel.config.cloud.account.tts.dialog.message"
            )}
            .value=${this._message ||
            this.hass.localize(
              "ui.panel.config.cloud.account.tts.dialog.example_message",
              { name: this.hass.user!.name }
            )}
          >
          </ha-textarea>

          <ha-select
            .label=${this.hass.localize(
              "ui.panel.config.cloud.account.tts.dialog.target"
            )}
            id="target"
            .value=${target}
            @selected=${this._handleTargetChanged}
            .options=${targetOptions}
          >
          </ha-select>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            slot="secondaryAction"
            .disabled=${target === "browser"}
            @click=${this._createAutomation}
          >
            <ha-svg-icon slot="start" .path=${mdiRobot}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.cloud.account.tts.dialog.create_automation"
            )}
          </ha-button>
          <ha-button
            slot="primaryAction"
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
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
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

    if (this._target === "browser") {
      // We create the audio element here + do a play, because iOS requires it to be done by user action
      const audio = new Audio();
      audio.play();
      this._playBrowser(message, audio);
    } else {
      this.hass.callService("tts", "cloud_say", {
        entity_id: this._target,
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
          data: {
            entity_id: this._target,
            message: message,
          },
        },
      ],
    });
    this.closeDialog();
  }

  private async _playBrowser(message: string, audio: HTMLAudioElement) {
    this._loadingExample = true;

    const language = this._params!.defaultVoice[0];
    const voice = this._params!.defaultVoice[1];

    let url;
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

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-textarea,
        ha-select {
          display: block;
          margin-top: 8px;
          width: 100%;
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
