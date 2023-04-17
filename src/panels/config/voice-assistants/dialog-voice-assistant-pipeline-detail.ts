import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-form/ha-form";
import { SchemaUnion } from "../../../components/ha-form/types";
import {
  AssistPipeline,
  AssistPipelineMutableParams,
} from "../../../data/assist_pipeline";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { VoiceAssistantPipelineDetailsDialogParams } from "./show-dialog-voice-assistant-pipeline-detail";

@customElement("dialog-voice-assistant-pipeline-detail")
export class DialogVoiceAssistantPipelineDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: VoiceAssistantPipelineDetailsDialogParams;

  @state() private _data?: Partial<AssistPipeline>;

  @state() private _error?: Record<string, string>;

  @state() private _submitting = false;

  public showDialog(params: VoiceAssistantPipelineDetailsDialogParams): void {
    this._params = params;
    this._error = undefined;
    if (this._params.pipeline) {
      this._data = this._params.pipeline;
    } else {
      this._data = {};
    }
  }

  public closeDialog(): void {
    this._params = undefined;
    this._data = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
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
          <ha-form
            .schema=${this._schema()}
            .data=${this._data}
            .hass=${this.hass}
            .error=${this._error}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
        ${this._params.pipeline?.id
          ? html`
              <ha-button
                slot="secondaryAction"
                class="warning"
                @click=${this._deletePipeline}
                .disabled=${this._submitting}
              >
                ${this.hass.localize("ui.common.delete")}
              </ha-button>
            `
          : nothing}
        <ha-button
          slot="primaryAction"
          @click=${this._updatePipeline}
          .disabled=${Boolean(this._error) || this._submitting}
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

  private _schema = memoizeOne(
    () =>
      [
        {
          name: "name",
          required: true,
          selector: {
            text: {},
          },
        },
        {
          name: "conversation_engine",
          required: true,
          selector: {
            text: {},
          },
        },
        {
          name: "language",
          required: true,
          selector: {
            text: {},
          },
        },
        {
          name: "stt_engine",
          required: true,
          selector: {
            stt: {},
          },
          context: { language: "language" },
        },
        {
          name: "tts_engine",
          required: true,
          selector: {
            text: {},
          },
        },
      ] as const
  );

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.voice_assistants.assistants.pipeline.detail.form.${schema.name}`
    );

  private _valueChanged(ev: CustomEvent) {
    this._error = undefined;
    const value = ev.detail.value;
    this._data = value;
  }

  private async _updatePipeline() {
    this._submitting = true;
    try {
      if (this._params!.pipeline?.id) {
        const values: Partial<AssistPipelineMutableParams> = {
          name: this._data!.name,
          conversation_engine: this._data!.conversation_engine,
          language: this._data!.language,
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

  private async _deletePipeline() {
    this._submitting = true;
    try {
      if (await this._params!.deletePipeline()) {
        this.closeDialog();
      }
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [haStyleDialog, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-voice-assistant-pipeline-detail": DialogVoiceAssistantPipelineDetail;
  }
}
