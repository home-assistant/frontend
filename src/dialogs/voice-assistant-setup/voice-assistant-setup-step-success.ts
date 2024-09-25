import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import "../../components/ha-md-list-item";
import "../../components/ha-tts-voice-picker";
import {
  AssistPipeline,
  listAssistPipelines,
  setAssistPipelinePreferred,
  updateAssistPipeline,
} from "../../data/assist_pipeline";
import {
  assistSatelliteAnnounce,
  AssistSatelliteConfiguration,
} from "../../data/assist_satellite";
import { fetchCloudStatus } from "../../data/cloud";
import { showVoiceAssistantPipelineDetailDialog } from "../../panels/config/voice-assistants/show-dialog-voice-assistant-pipeline-detail";
import "../../panels/lovelace/entity-rows/hui-select-entity-row";
import { HomeAssistant } from "../../types";
import { AssistantSetupStyles } from "./styles";
import { STEP } from "./voice-assistant-setup-dialog";

@customElement("ha-voice-assistant-setup-step-success")
export class HaVoiceAssistantSetupStepSuccess extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public assistConfiguration?: AssistSatelliteConfiguration;

  @property() public deviceId!: string;

  @property() public assistEntityId?: string;

  @state() private _ttsSettings?: any;

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has("assistConfiguration")) {
      this._setTtsSettings();
      return;
    }
    if (changedProperties.has("hass") && this.assistConfiguration) {
      const oldHass = changedProperties.get("hass") as this["hass"] | undefined;
      if (oldHass) {
        const oldState =
          oldHass.states[this.assistConfiguration.pipeline_entity_id];
        const newState =
          this.hass.states[this.assistConfiguration.pipeline_entity_id];
        if (oldState.state !== newState.state) {
          this._setTtsSettings();
        }
      }
    }
  }

  private _activeWakeWord = memoizeOne(
    (config: AssistSatelliteConfiguration | undefined) => {
      if (!config) {
        return "";
      }
      const activeId = config.active_wake_words[0];
      return config.available_wake_words.find((ww) => ww.id === activeId)
        ?.wake_word;
    }
  );

  protected override render() {
    return html`<div class="content">
        <img src="/static/icons/casita/loving.png" />
        <h1>Ready to assist!</h1>
        <p class="secondary">
          Make your assistant more personal by customizing shizzle to the
          manizzle
        </p>
        <ha-md-list-item
          interactive
          type="button"
          @click=${this._changeWakeWord}
        >
          Change wake word
          <span slot="supporting-text"
            >${this._activeWakeWord(this.assistConfiguration)}</span
          >
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-md-list-item>
        <hui-select-entity-row
          .hass=${this.hass}
          ._config=${{
            entity: this.assistConfiguration?.pipeline_entity_id,
          }}
        ></hui-select-entity-row>
        ${this._ttsSettings
          ? html`<ha-tts-voice-picker
              .hass=${this.hass}
              required
              .engineId=${this._ttsSettings.engine}
              .language=${this._ttsSettings.language}
              .value=${this._ttsSettings.voice}
              @value-changed=${this._voicePicked}
              @closed=${stopPropagation}
            ></ha-tts-voice-picker>`
          : nothing}
      </div>
      <div class="footer">
        <ha-button @click=${this._openPipeline}
          >Change assistant settings</ha-button
        >
        <ha-button @click=${this._close} unelevated>Done</ha-button>
      </div>`;
  }

  private async _getPipeline(): Promise<
    [AssistPipeline | undefined, string | undefined | null]
  > {
    if (!this.assistConfiguration?.pipeline_entity_id) {
      return [undefined, undefined];
    }

    const pipelineName =
      this.hass.states[this.assistConfiguration?.pipeline_entity_id].state;

    const pipelines = await listAssistPipelines(this.hass);

    let pipeline: AssistPipeline | undefined;

    if (pipelineName === "preferred") {
      pipeline = pipelines.pipelines.find(
        (ppln) => ppln.id === pipelines.preferred_pipeline
      );
    } else {
      pipeline = pipelines.pipelines.find((ppln) => ppln.name === pipelineName);
    }
    return [pipeline, pipelines.preferred_pipeline];
  }

  private async _setTtsSettings() {
    const [pipeline] = await this._getPipeline();
    if (!pipeline) {
      this._ttsSettings = undefined;
      return;
    }
    this._ttsSettings = {
      engine: pipeline.tts_engine,
      voice: pipeline.tts_voice,
      language: pipeline.tts_language,
    };
  }

  private async _voicePicked(ev) {
    const [pipeline] = await this._getPipeline();

    if (!pipeline) {
      return;
    }

    await updateAssistPipeline(this.hass, pipeline.id, {
      ...pipeline,
      tts_voice: ev.detail.value,
    });
    this._announce("Hello, how can I help you?");
  }

  private async _announce(message: string) {
    if (!this.assistEntityId) {
      return;
    }
    await assistSatelliteAnnounce(this.hass, this.assistEntityId, message);
  }

  private _changeWakeWord() {
    fireEvent(this, "next-step", { step: STEP.CHANGE_WAKEWORD });
  }

  private async _openPipeline() {
    const [pipeline, preferred_pipeline] = await this._getPipeline();

    if (!pipeline) {
      return;
    }

    const cloudStatus = await fetchCloudStatus(this.hass);

    showVoiceAssistantPipelineDetailDialog(this, {
      cloudActiveSubscription:
        cloudStatus.logged_in && cloudStatus.active_subscription,
      pipeline,
      preferred: pipeline.id === preferred_pipeline,
      updatePipeline: async (values) => {
        await updateAssistPipeline(this.hass!, pipeline!.id, values);
      },
      setPipelinePreferred: async () => {
        await setAssistPipelinePreferred(this.hass!, pipeline!.id);
      },
      hideWakeWord: true,
    });
  }

  private _close() {
    fireEvent(this, "closed");
  }

  static styles = [
    AssistantSetupStyles,
    css`
      ha-md-list-item {
        text-align: initial;
      }
      ha-tts-voice-picker {
        margin-top: 16px;
        display: block;
      }
      .footer {
        margin-top: 24px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-success": HaVoiceAssistantSetupStepSuccess;
  }
}
