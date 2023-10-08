import {
  mdiBug,
  mdiClose,
  mdiDotsVertical,
  mdiStar,
  mdiStarOutline,
} from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-button";
import "../../../components/ha-dialog-header";
import "../../../components/ha-form/ha-form";
import {
  AssistPipeline,
  AssistPipelineMutableParams,
  fetchAssistPipelineLanguages,
} from "../../../data/assist_pipeline";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "./assist-pipeline-detail/assist-pipeline-detail-config";
import "./assist-pipeline-detail/assist-pipeline-detail-conversation";
import "./assist-pipeline-detail/assist-pipeline-detail-stt";
import "./assist-pipeline-detail/assist-pipeline-detail-tts";
import "./assist-pipeline-detail/assist-pipeline-detail-wakeword";
import "./debug/assist-render-pipeline-events";
import { VoiceAssistantPipelineDetailsDialogParams } from "./show-dialog-voice-assistant-pipeline-detail";

@customElement("dialog-voice-assistant-pipeline-detail")
export class DialogVoiceAssistantPipelineDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: VoiceAssistantPipelineDetailsDialogParams;

  @state() private _data?: Partial<AssistPipeline>;

  @state() private _preferred?: boolean;

  @state() private _cloudActive?: boolean;

  @state() private _error?: Record<string, string>;

  @state() private _submitting = false;

  @state() private _supportedLanguages?: string[];

  public showDialog(params: VoiceAssistantPipelineDetailsDialogParams): void {
    this._params = params;
    this._error = undefined;
    this._cloudActive = this._params.cloudActiveSubscription;
    if (this._params.pipeline) {
      this._data = this._params.pipeline;
      this._preferred = this._params.preferred;
    } else {
      this._data = {
        language: (
          this.hass.config.language || this.hass.locale.language
        ).substring(0, 2),
        stt_engine: this._cloudActive ? "cloud" : undefined,
        tts_engine: this._cloudActive ? "cloud" : undefined,
      };
    }
  }

  public closeDialog(): void {
    this._params = undefined;
    this._data = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected firstUpdated() {
    this._getSupportedLanguages();
  }

  private async _getSupportedLanguages() {
    const { languages } = await fetchAssistPipelineLanguages(this.hass);
    this._supportedLanguages = languages;
  }

  protected render() {
    if (!this._params || !this._data) {
      return nothing;
    }

    const title = this._params.pipeline?.id
      ? this._params.pipeline.name
      : this.hass.localize(
          "ui.panel.config.voice_assistants.assistants.pipeline.detail.add_assistant_title"
        );

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${title}
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title" .title=${title}>${title}</span>
          ${this._params.pipeline?.id
            ? html`
                <ha-icon-button
                  slot="actionItems"
                  .label=${this.hass.localize(
                    "ui.panel.config.voice_assistants.assistants.pipeline.detail.set_as_preferred"
                  )}
                  .path=${this._preferred ? mdiStar : mdiStarOutline}
                  @click=${this._setPreferred}
                  .disabled=${Boolean(this._preferred)}
                ></ha-icon-button>

                <ha-button-menu
                  corner="BOTTOM_END"
                  menuCorner="END"
                  slot="actionItems"
                  @closed=${stopPropagation}
                  fixed
                >
                  <ha-icon-button
                    slot="trigger"
                    .label=${this.hass.localize("ui.common.menu")}
                    .path=${mdiDotsVertical}
                  ></ha-icon-button>
                  <ha-list-item graphic="icon" @request-selected=${this._debug}>
                    ${this.hass.localize(
                      "ui.panel.config.voice_assistants.assistants.pipeline.detail.debug"
                    )}
                    <ha-svg-icon slot="graphic" .path=${mdiBug}></ha-svg-icon>
                  </ha-list-item>
                </ha-button-menu>
              `
            : nothing}
        </ha-dialog-header>
        <div class="content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing}
          <assist-pipeline-detail-config
            .hass=${this.hass}
            .data=${this._data}
            .supportedLanguages=${this._supportedLanguages}
            keys="name,language"
            @value-changed=${this._valueChanged}
            dialogInitialFocus
          ></assist-pipeline-detail-config>
          <assist-pipeline-detail-conversation
            .hass=${this.hass}
            .data=${this._data}
            keys="conversation_engine,conversation_language"
            @value-changed=${this._valueChanged}
          ></assist-pipeline-detail-conversation>
          ${!this._cloudActive &&
          (this._data.tts_engine === "cloud" ||
            this._data.stt_engine === "cloud")
            ? html`
                <ha-alert alert-type="warning">
                  ${this.hass.localize(
                    "ui.panel.config.voice_assistants.assistants.pipeline.detail.no_cloud_message"
                  )}
                  <a
                    href="/config/cloud"
                    slot="action"
                    @click=${this.closeDialog}
                  >
                    <ha-button>
                      ${this.hass.localize(
                        "ui.panel.config.voice_assistants.assistants.pipeline.detail.no_cloud_action"
                      )}
                    </ha-button>
                  </a>
                </ha-alert>
              `
            : nothing}
          <assist-pipeline-detail-stt
            .hass=${this.hass}
            .data=${this._data}
            keys="stt_engine,stt_language"
            @value-changed=${this._valueChanged}
          ></assist-pipeline-detail-stt>
          <assist-pipeline-detail-tts
            .hass=${this.hass}
            .data=${this._data}
            keys="tts_engine,tts_language,tts_voice"
            @value-changed=${this._valueChanged}
          ></assist-pipeline-detail-tts>
          <assist-pipeline-detail-wakeword
            .hass=${this.hass}
            .data=${this._data}
            keys="wake_word_entity,wake_word_id"
            @value-changed=${this._valueChanged}
          ></assist-pipeline-detail-wakeword>
        </div>
        ${this._params.pipeline?.id
          ? html`
              <ha-button
                slot="secondaryAction"
                class="warning"
                .disabled=${this._preferred || this._submitting}
                @click=${this._deletePipeline}
              >
                ${this.hass.localize("ui.common.delete")}
              </ha-button>
            `
          : nothing}
        <ha-button
          slot="primaryAction"
          @click=${this._updatePipeline}
          .disabled=${this._submitting}
          dialogInitialFocus
        >
          ${this._params.pipeline?.id
            ? this.hass.localize(
                "ui.panel.config.voice_assistants.assistants.pipeline.detail.update_assistant_action"
              )
            : this.hass.localize(
                "ui.panel.config.voice_assistants.assistants.pipeline.detail.add_assistant_action"
              )}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    this._error = undefined;
    const value = {};
    (ev.currentTarget as any)
      .getAttribute("keys")
      .split(",")
      .forEach((key) => {
        value[key] = ev.detail.value[key];
      });
    this._data = { ...this._data, ...value };
  }

  private async _updatePipeline() {
    this._submitting = true;
    try {
      const data = this._data!;
      const values: AssistPipelineMutableParams = {
        name: data.name!,
        language: data.language!,
        conversation_engine: data.conversation_engine!,
        conversation_language: data.conversation_language ?? null,
        stt_engine: data.stt_engine ?? null,
        stt_language: data.stt_language ?? null,
        tts_engine: data.tts_engine ?? null,
        tts_language: data.tts_language ?? null,
        tts_voice: data.tts_voice ?? null,
        wake_word_entity: data.wake_word_entity ?? null,
        wake_word_id: data.wake_word_id ?? null,
      };
      if (this._params!.pipeline?.id) {
        await this._params!.updatePipeline(values);
      } else {
        await this._params!.createPipeline(values);
      }
      this.closeDialog();
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _setPreferred() {
    this._submitting = true;
    try {
      await this._params!.setPipelinePreferred();
      this._preferred = true;
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private _debug(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) return;
    navigate(`/config/voice-assistants/debug/${this._params!.pipeline!.id}`);
    this.closeDialog();
  }

  private async _deletePipeline() {
    this._submitting = true;
    try {
      if (await this._params!.deletePipeline()) {
        this.closeDialog();
      }
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .content > *:not(:last-child) {
          margin-bottom: 16px;
          display: block;
        }
        ha-alert {
          margin-bottom: 16px;
          display: block;
        }
        a {
          text-decoration: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-voice-assistant-pipeline-detail": DialogVoiceAssistantPipelineDetail;
  }
}
