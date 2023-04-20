import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-form/ha-form";
import {
  AssistPipeline,
  AssistPipelineMutableParams,
  fetchAssistPipelineLanguages,
} from "../../../data/assist_pipeline";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "./assist-pipeline-detail/assist-pipeline-detail-conversation";
import "./assist-pipeline-detail/assist-pipeline-detail-general";
import "./assist-pipeline-detail/assist-pipeline-detail-stt";
import "./assist-pipeline-detail/assist-pipeline-detail-tts";
import "./debug/assist-render-pipeline-events";
import { VoiceAssistantPipelineDetailsDialogParams } from "./show-dialog-voice-assistant-pipeline-detail";

@customElement("dialog-voice-assistant-pipeline-detail")
export class DialogVoiceAssistantPipelineDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: VoiceAssistantPipelineDetailsDialogParams;

  @state() private _data?: Partial<AssistPipeline>;

  @state() private _preferred?: boolean;

  @state() private _error?: Record<string, string>;

  @state() private _submitting = false;

  @state() private _supportedLanguages: string[] = [];

  public showDialog(params: VoiceAssistantPipelineDetailsDialogParams): void {
    this._params = params;
    this._error = undefined;
    if (this._params.pipeline) {
      this._data = this._params.pipeline;
      this._preferred = this._params.preferred;
    } else {
      this._data = {};
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

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._params.pipeline?.id
            ? this._params.pipeline.name
            : this.hass.localize(
                "ui.panel.config.voice_assistants.assistants.pipeline.detail.add_assistant_title"
              )
        )}
      >
        <div>
          <assist-pipeline-detail-general
            .hass=${this.hass}
            .data=${this._data}
            .error=${this._error}
            .supportedLanguages=${this._supportedLanguages}
            @value-changed=${this._valueChanged}
          ></assist-pipeline-detail-general>
          <assist-pipeline-detail-conversation
            .hass=${this.hass}
            .data=${this._data}
            .error=${this._error}
            @value-changed=${this._valueChanged}
          ></assist-pipeline-detail-conversation>
          <assist-pipeline-detail-stt
            .hass=${this.hass}
            .data=${this._data}
            .error=${this._error}
            @value-changed=${this._valueChanged}
          ></assist-pipeline-detail-stt>
          <assist-pipeline-detail-tts
            .hass=${this.hass}
            .data=${this._data}
            .error=${this._error}
            @value-changed=${this._valueChanged}
          ></assist-pipeline-detail-tts>
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
              <ha-button
                .disabled=${this._preferred}
                slot="secondaryAction"
                @click=${this._setPreferred}
                >Set as preferred</ha-button
              >
              <a
                href="/config/voice-assistants/debug/${this._params.pipeline
                  .id}"
                slot="secondaryAction"
                @click=${this.closeDialog}
                ><ha-button>Debug</ha-button>
              </a>
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
    const value = ev.detail.value;
    this._data = value;
  }

  private async _updatePipeline() {
    this._submitting = true;
    try {
      if (this._params!.pipeline?.id) {
        const values: AssistPipelineMutableParams = {
          name: this._data!.name!,
          conversation_engine: this._data!.conversation_engine!,
          language: this._data!.language!,
          stt_engine: this._data!.stt_engine,
          tts_engine: this._data!.tts_engine,
        };
        await this._params!.updatePipeline(values);
      } else {
        await this._params!.createPipeline(
          this._data as AssistPipelineMutableParams
        );
      }
      this.closeDialog();
    } catch (err: any) {
      this._error = { base: err?.message || "Unknown error" };
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
      this._error = { base: err?.message || "Unknown error" };
    } finally {
      this._submitting = false;
    }
  }

  private async _deletePipeline() {
    this._submitting = true;
    try {
      if (await this._params!.deletePipeline()) {
        this.closeDialog();
      }
    } catch (err: any) {
      this._error = { base: err?.message || "Unknown error" };
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        assist-pipeline-detail-general,
        assist-pipeline-detail-conversation,
        assist-pipeline-detail-stt,
        assist-pipeline-detail-tts {
          margin-bottom: 16px;
          display: block;
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
